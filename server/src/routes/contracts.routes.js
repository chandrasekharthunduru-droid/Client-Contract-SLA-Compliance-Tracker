const express = require('express');
const router = express.Router();
const { getContracts, getContractById, createContract, updateContract, deleteContract, archiveContract } = require('../controllers/contracts.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getContracts);
router.get('/:id', getContractById);
router.post('/', createContract);
router.put('/:id', updateContract);
router.put('/:id/archive', archiveContract);
router.delete('/:id', deleteContract);

module.exports = router;
