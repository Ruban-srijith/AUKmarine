const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/', authenticate, brandController.getBrands);
router.post('/', authenticate, authorize(['Owner', 'Manager']), brandController.createBrand);
router.put('/:id', authenticate, authorize(['Owner', 'Manager']), brandController.updateBrand);
router.delete('/:id', authenticate, authorize(['Owner', 'Manager']), brandController.deleteBrand);

module.exports = router;
