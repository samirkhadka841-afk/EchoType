const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'echotyping.db');

console.log('=== EchoTyping Database Diagnostic ===\n');

// Check if DB file exists
if (!fs.existsSync(dbPath)) {
  console.log('❌ Database file NOT FOUND at:', dbPath);
  console.log('   The DB is created when the server starts and someone registers.');
  console.log('\n👉 Start the server: npm start');
  console.log('👉 Open http://localhost:3000 in browser');
  console.log('👉 Register an account and take a typing test');
  process.exit(1);
}

console.log('✅ Database file found:', dbPath);
console.log('   Size:', (fs.statSync(dbPath).size / 1024).toFixed(2), 'KB\n');

// Check tables
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) { console.error('Error:', err); process.exit(1); }

  console.log('Tables found:', tables.map(t => t.name).join(', '));
  console.log('');

  // Count rows in each table
  const counts = ['users', 'tests', 'achievements', 'activity', 'keystrokes'];
  let pending = counts.length;

  counts.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
      const count = err ? 'ERROR' : row.count;
      const icon = count > 0 ? '✅' : '⚪';
      console.log(`${icon} ${table.padEnd(15)} → ${count} rows`);
      pending--;
      if (pending === 0) {
        console.log('\n=== End Diagnostic ===');
        db.close();
      }
    });
  });
});
