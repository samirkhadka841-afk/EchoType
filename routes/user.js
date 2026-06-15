const express = require('express');
const { get, all } = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
    const tests = await all('SELECT * FROM tests WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    const achievements = await all('SELECT * FROM achievements WHERE user_id = ?', [req.userId]);
    const activity = await all('SELECT * FROM activity WHERE user_id = ? ORDER BY date DESC', [req.userId]);

    delete user.password;
    res.json({ user, tests, achievements, activity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

router.post('/achievements', verifyToken, async (req, res) => {
  const { achievementId } = req.body;
  try {
    const existing = await get('SELECT * FROM achievements WHERE user_id = ? AND achievement_id = ?',
      [req.userId, achievementId]);
    if (existing) {
      return res.status(409).json({ error: 'Achievement already unlocked.' });
    }
    await run('INSERT INTO achievements (user_id, achievement_id) VALUES (?, ?)',
      [req.userId, achievementId]);
    res.status(201).json({ message: 'Achievement unlocked.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save achievement.' });
  }
});

module.exports = router;
