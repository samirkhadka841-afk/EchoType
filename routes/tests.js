const express = require('express');
const { run, get, all } = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/tests
router.post('/', verifyToken, async (req, res) => {
  console.log('SAVE TEST called by user:', req.userId);
  console.log('Test data:', JSON.stringify(req.body, null, 2));
  const data = req.body;
  const userId = req.userId;

  try {
    const result = await run(`
      INSERT INTO tests (
        user_id, wpm, raw_wpm, accuracy, consistency, burst,
        mode, mode_limit, language, punctuation, numbers, blind_mode,
        duration_ms, chars_correct, chars_incorrect, chars_extra, chars_missed,
        words_correct, words_incorrect
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, data.wpm, data.rawWpm, data.accuracy, data.consistency, data.burst,
      data.mode, data.modeLimit, data.language,
      data.punctuation ? 1 : 0, data.numbers ? 1 : 0, data.blindMode ? 1 : 0,
      data.durationMs, data.charsCorrect, data.charsIncorrect, data.charsExtra, data.charsMissed,
      data.wordsCorrect, data.wordsIncorrect
    ]);

    const testId = result.lastID;

    if (data.keystrokes && data.keystrokes.length > 0) {
      for (const k of data.keystrokes) {
        await run(`
          INSERT INTO keystrokes (test_id, user_id, char, expected, timestamp_ms, is_correct, is_backspace, word_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [testId, userId, k.char, k.expected, k.timestampMs, k.isCorrect ? 1 : 0, k.isBackspace ? 1 : 0, k.wordIndex]);
      }
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    const newTotalTests = (user.total_tests || 0) + 1;
    const newTotalTime = (user.total_time_s || 0) + Math.round(data.durationMs / 1000);
    const newXp = (user.xp || 0) + Math.round(data.wpm * 1.5);
    const newLevel = Math.floor(newXp / 500) + 1;
    const newPbWpm = Math.max(user.pb_wpm || 0, data.wpm);
    const newPbAcc = Math.max(user.pb_acc || 0, data.accuracy);

    await run(`
      UPDATE users SET total_tests = ?, total_time_s = ?, xp = ?, level = ?, pb_wpm = ?, pb_acc = ?
      WHERE id = ?
    `, [newTotalTests, newTotalTime, newXp, newLevel, newPbWpm, newPbAcc, userId]);

    const today = new Date().toISOString().split('T')[0];
    const existingActivity = await get('SELECT * FROM activity WHERE user_id = ? AND date = ?', [userId, today]);
    if (existingActivity) {
      const newCount = (existingActivity.tests_count || 0) + 1;
      const newTime = (existingActivity.total_time_ms || 0) + data.durationMs;
      const newAvg = Math.round(((existingActivity.avg_wpm * (newCount - 1)) + data.wpm) / newCount);
      await run('UPDATE activity SET tests_count = ?, total_time_ms = ?, avg_wpm = ? WHERE id = ?',
        [newCount, newTime, newAvg, existingActivity.id]);
    } else {
      await run('INSERT INTO activity (user_id, date, tests_count, total_time_ms, avg_wpm) VALUES (?, ?, ?, ?, ?)',
        [userId, today, 1, data.durationMs, data.wpm]);
    }

    res.status(201).json({ id: testId, message: 'Test saved.' });
  } catch (err) {
    console.error('SAVE TEST ERROR:', err.stack || err.message || err);
    res.status(500).json({ error: 'Failed to save test.', details: err.message });
  }
});

// GET /api/tests
router.get('/', verifyToken, async (req, res) => {
  try {
    const tests = await all('SELECT * FROM tests WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tests.' });
  }
});

module.exports = router;
