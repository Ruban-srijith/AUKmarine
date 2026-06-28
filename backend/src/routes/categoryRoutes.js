const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/', authenticate, categoryController.getCategories);
router.post('/', authenticate, authorize(['Owner', 'Manager']), categoryController.createCategory);
router.put('/:id', authenticate, authorize(['Owner', 'Manager']), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize(['Owner', 'Manager']), categoryController.deleteCategory);

module.exports = router;
