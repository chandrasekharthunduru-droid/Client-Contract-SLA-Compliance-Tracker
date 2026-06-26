const express = require('express');
const router = express.Router();
const { getIncidents, getIncidentById, createIncident, updateIncident, closeIncident } = require('../controllers/incidents.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.post('/', createIncident);
router.put('/:id', updateIncident);
router.put('/:id/close', closeIncident);

module.exports = router;
