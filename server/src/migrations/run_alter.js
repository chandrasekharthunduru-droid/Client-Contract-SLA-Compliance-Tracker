const pool = require('../config/db');

async function runAlter() {
  console.log('🚀 Running database schema update...');
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS working_on TEXT;
    `);
    console.log('✅ Added working_on column');

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_status VARCHAR(50) DEFAULT 'Active';
    `);
    console.log('✅ Added employee_status column');

    console.log('✅ Database schema update complete!');
  } catch (err) {
    console.error('❌ Schema update failed:', err.message);
  } finally {
    await pool.end();
  }
}

runAlter();
