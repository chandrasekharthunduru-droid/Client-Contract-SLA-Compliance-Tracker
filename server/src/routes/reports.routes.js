const express = require('express');
const router = express.Router();
const { getReportSummary } = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/summary', getReportSummary);

module.exports = router;
