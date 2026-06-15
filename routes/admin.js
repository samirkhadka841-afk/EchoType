const express = require('express');
const { all } = require('../db');
const router = express.Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'owner-only-secret-key-2026';

function checkAdmin(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!key || key !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden. Invalid or missing admin key.' });
  }
  next();
}

router.get('/users', checkAdmin, async (req, res) => {
  try {
    const users = await all('SELECT id, username, email, avatar, level, xp, total_tests, pb_wpm, pb_acc, joined_at FROM users');
    res.json(users || []);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/tests', checkAdmin, async (req, res) => {
  try {
    const tests = await all(`
      SELECT t.id, u.username, t.wpm, t.accuracy, t.mode, t.language, t.created_at
      FROM tests t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);
    res.json(tests || []);
  } catch (err) {
    console.error('Admin tests error:', err);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

router.get('/stats', checkAdmin, async (req, res) => {
  try {
    const userCount = await all('SELECT COUNT(*) as count FROM users');
    const testCount = await all('SELECT COUNT(*) as count FROM tests');
    const avgWpm = await all('SELECT AVG(wpm) as avg FROM tests');
    const topUser = await all(`
      SELECT u.username, MAX(t.wpm) as best_wpm
      FROM tests t JOIN users u ON t.user_id = u.id
      GROUP BY t.user_id ORDER BY best_wpm DESC LIMIT 1
    `);
    res.json({
      totalUsers: (userCount[0] && userCount[0].count) || 0,
      totalTests: (testCount[0] && testCount[0].count) || 0,
      averageWpm: Math.round((avgWpm[0] && avgWpm[0].avg) || 0),
      topUser: topUser[0] || null
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
