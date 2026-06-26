const express = require('express');
const router = express.Router();
const { getSLAs, getSLAById, createSLA, updateSLA, deleteSLA } = require('../controllers/sla.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getSLAs);
router.get('/:id', getSLAById);
router.post('/', createSLA);
router.put('/:id', updateSLA);
router.delete('/:id', deleteSLA);

module.exports = router;
