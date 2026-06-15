const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'echotyping.db');
const db = new sqlite3.Database(dbPath);

// Promisify helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables
async function initDB() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      joined_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      total_tests INTEGER DEFAULT 0,
      total_time_s INTEGER DEFAULT 0,
      pb_wpm INTEGER DEFAULT 0,
      pb_acc REAL DEFAULT 0,
      streak_current INTEGER DEFAULT 0,
      streak_best INTEGER DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      wpm INTEGER NOT NULL,
      raw_wpm INTEGER NOT NULL,
      accuracy INTEGER NOT NULL,
      consistency INTEGER NOT NULL,
      burst INTEGER NOT NULL,
      mode TEXT NOT NULL,
      mode_limit INTEGER,
      language TEXT NOT NULL,
      punctuation INTEGER DEFAULT 0,
      numbers INTEGER DEFAULT 0,
      blind_mode INTEGER DEFAULT 0,
      duration_ms INTEGER NOT NULL,
      chars_correct INTEGER DEFAULT 0,
      chars_incorrect INTEGER DEFAULT 0,
      chars_extra INTEGER DEFAULT 0,
      chars_missed INTEGER DEFAULT 0,
      words_correct INTEGER DEFAULT 0,
      words_incorrect INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      UNIQUE(user_id, achievement_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      tests_count INTEGER DEFAULT 0,
      total_time_ms INTEGER DEFAULT 0,
      avg_wpm INTEGER DEFAULT 0,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS keystrokes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      char TEXT,
      expected TEXT,
      timestamp_ms INTEGER NOT NULL,
      is_correct INTEGER DEFAULT 0,
      is_backspace INTEGER DEFAULT 0,
      word_index INTEGER DEFAULT 0,
      FOREIGN KEY (test_id) REFERENCES tests(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('✅ Database initialized');
}

initDB().catch(err => console.error('DB init error:', err));

module.exports = { db, run, get, all };
