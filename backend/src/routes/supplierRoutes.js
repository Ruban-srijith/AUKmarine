const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/', authenticate, supplierController.getSuppliers);
router.get('/:id', authenticate, supplierController.getSupplierById);

router.post('/', authenticate, authorize(['Owner', 'Manager']), supplierController.createSupplier);
router.put('/:id', authenticate, authorize(['Owner', 'Manager']), supplierController.updateSupplier);
router.delete('/:id', authenticate, authorize(['Owner']), supplierController.deleteSupplier);

module.exports = router;
