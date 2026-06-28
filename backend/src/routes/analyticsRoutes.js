const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/dashboard', authenticate, analyticsController.getDashboardStats); // Available for dashboard widgets (Staff/Manager/Owner, though Staff has some fields restricted in front, backend dashboard serves cards)
router.get('/full', authenticate, authorize(['Owner', 'Manager']), analyticsController.getFullAnalytics);

module.exports = router;
