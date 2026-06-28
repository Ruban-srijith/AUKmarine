const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/', authenticate, settingsController.getSettings);
router.put('/', authenticate, authorize(['Owner']), settingsController.updateSettings);

module.exports = router;
