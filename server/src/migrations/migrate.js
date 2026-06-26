const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  console.log('🚀 Running database migrations...');
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '001_schema.sql'),
      'utf8'
    );
    await pool.query(sql);
    console.log('✅ Schema migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
