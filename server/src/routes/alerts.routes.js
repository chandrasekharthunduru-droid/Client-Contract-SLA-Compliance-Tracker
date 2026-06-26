const express = require('express');
const router = express.Router();
const { getAlerts, markAlertRead, markAllRead, dismissAlert } = require('../controllers/alerts.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getAlerts);
router.put('/read-all', markAllRead);
router.put('/:id/read', markAlertRead);
router.delete('/:id', dismissAlert);

module.exports = router;
