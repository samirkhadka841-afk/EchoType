const express = require('express');
const { all } = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  const filter = req.query.filter || 'all';
  const now = Date.now();
  let timeFilter = '';
  let params = [];

  if (filter === 'daily') {
    const dayAgo = now - 86400000;
    timeFilter = 'AND t.created_at > ?';
    params = [dayAgo];
  } else if (filter === 'weekly') {
    const weekAgo = now - 7 * 86400000;
    timeFilter = 'AND t.created_at > ?';
    params = [weekAgo];
  } else if (filter === 'monthly') {
    const monthAgo = now - 30 * 86400000;
    timeFilter = 'AND t.created_at > ?';
    params = [monthAgo];
  }

  try {
    const rows = await all(`
      SELECT u.id, u.username, u.avatar, MAX(t.wpm) as wpm, t.accuracy, t.mode, t.language
      FROM tests t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1 ${timeFilter}
      GROUP BY t.user_id
      ORDER BY wpm DESC
      LIMIT 50
    `, params);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

module.exports = router;
