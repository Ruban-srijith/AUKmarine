const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/', authenticate, authorize(['Owner', 'Manager']), salesController.getSales);
router.get('/:id', authenticate, salesController.getSaleById);
router.post('/', authenticate, salesController.createSale); // Staff can check out/create billing invoices!

module.exports = router;
