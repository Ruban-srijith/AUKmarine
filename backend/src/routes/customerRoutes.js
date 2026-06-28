const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/', authenticate, customerController.getCustomers);
router.get('/:id', authenticate, customerController.getCustomerById);

router.post('/', authenticate, authorize(['Owner', 'Manager']), customerController.createCustomer);
router.put('/:id', authenticate, authorize(['Owner', 'Manager']), customerController.updateCustomer);
router.delete('/:id', authenticate, authorize(['Owner']), customerController.deleteCustomer);

module.exports = router;
