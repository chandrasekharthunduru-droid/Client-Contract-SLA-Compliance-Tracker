require('dotenv').config();
const app = require('./app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test DB connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection verified');

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║  🚀 BrandSparkX Contract & SLA Tracker               ║
║  Server running on http://localhost:${PORT}              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                     ║
╚══════════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('💡 Make sure your DATABASE_URL in .env is correct and Supabase is accessible');
    process.exit(1);
  }
};

startServer();
