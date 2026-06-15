const { run, get, all } = require('./db');

async function seed() {
  console.log('Seeding fake data...\n');

  // Create a fake user
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('password123', 10);

  const userResult = await run(
    'INSERT OR IGNORE INTO users (username, email, password, avatar, xp, level, total_tests, pb_wpm) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ['testuser', 'test@example.com', hash, 'TU', 1500, 4, 12, 85]
  );

  const user = await get('SELECT * FROM users WHERE username = ?', ['testuser']);
  console.log('✅ User created:', user.username, '(ID:', user.id + ')');

  // Insert fake tests
  for (let i = 0; i < 5; i++) {
    const wpm = 60 + Math.floor(Math.random() * 40);
    await run(`
      INSERT INTO tests (user_id, wpm, raw_wpm, accuracy, consistency, burst, mode, mode_limit, language, duration_ms, chars_correct, chars_incorrect, words_correct, words_incorrect)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [user.id, wpm, wpm + 5, 90 + Math.floor(Math.random() * 10), 75, 100, 'time', 60, 'english', 15000, 300, 5, 50, 2]);
  }
  console.log('✅ 5 fake tests inserted');

  // Insert fake achievements
  await run('INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)', [user.id, 'first_test']);
  await run('INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)', [user.id, 'wpm_50']);
  console.log('✅ 2 fake achievements inserted');

  // Insert fake activity
  const today = new Date().toISOString().split('T')[0];
  await run('INSERT OR IGNORE INTO activity (user_id, date, tests_count, total_time_ms, avg_wpm) VALUES (?, ?, ?, ?, ?)', 
    [user.id, today, 5, 75000, 72]);
  console.log('✅ Fake activity inserted');

  console.log('\n🎉 Seed complete! Open DB Browser and check echotyping.db');
  console.log('   Login: testuser / password123');
}

seed().catch(console.error);
