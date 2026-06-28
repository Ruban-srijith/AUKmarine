const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/', authenticate, authorize(['Owner', 'Manager']), purchaseController.getPurchases);
router.get('/:id', authenticate, authorize(['Owner', 'Manager']), purchaseController.getPurchaseById);
router.post('/', authenticate, authorize(['Owner', 'Manager']), purchaseController.createPurchase);
router.put('/:id/status', authenticate, authorize(['Owner', 'Manager']), purchaseController.updatePurchaseStatus);

module.exports = router;
