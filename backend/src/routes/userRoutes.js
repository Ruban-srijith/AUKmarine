const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/', authenticate, authorize(['Owner', 'Manager']), userController.getUsers);
router.post('/', authenticate, authorize(['Owner', 'Manager']), userController.createUser);
router.put('/:id', authenticate, authorize(['Owner', 'Manager']), userController.updateUserRole);
router.delete('/:id', authenticate, authorize(['Owner']), userController.deleteUser);
router.get('/audit-logs', authenticate, authorize(['Owner', 'Manager']), userController.getAuditLogs);

module.exports = router;
