require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./src/routes/auth.routes');
const contractRoutes = require('./src/routes/contracts.routes');
const customerRoutes = require('./src/routes/customers.routes');
const slaRoutes = require('./src/routes/sla.routes');
const incidentRoutes = require('./src/routes/incidents.routes');
const alertRoutes = require('./src/routes/alerts.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const reportRoutes = require('./src/routes/reports.routes');
const userRoutes = require('./src/routes/users.routes');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

const app = express();

// ── Security & Logging ──────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));

// ── CORS ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
  ],
  credentials: true,
}));

// ── Body Parser ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'BrandSparkX Contract & SLA Tracker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// ── Error Handling ────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
