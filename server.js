require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { all } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'owner-only-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/user', require('./routes/user'));

// INLINE ADMIN ROUTES (bulletproof - no separate file needed)
function checkAdmin(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!key || key !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden. Invalid or missing admin key.' });
  }
  next();
}

app.get('/api/admin/users', checkAdmin, async (req, res) => {
  try {
    const users = await all('SELECT id, username, email, avatar, level, xp, total_tests, pb_wpm, pb_acc, joined_at FROM users');
    res.json(users || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/tests', checkAdmin, async (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

app.get('/api/admin/stats', checkAdmin, async (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Serve static frontend files from same folder
app.use(express.static(path.join(__dirname)));

// Admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fallback: serve the HTML for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('UNCAUGHT ERROR:', err.stack || err.message || err);
  res.status(500).json({ error: 'Server crashed', details: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ EchoTyping server running on http://localhost:${PORT}`);
  console.log(`📁 API: http://localhost:${PORT}/api`);
  console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});
