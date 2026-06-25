const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/logController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.get('/', protect, requireAdmin, getActivityLogs);

module.exports = router;
