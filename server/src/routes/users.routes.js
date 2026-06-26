const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Protect all routes: Must be logged in AND must be an admin
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
