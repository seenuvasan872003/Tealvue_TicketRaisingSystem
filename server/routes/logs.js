const express = require('express');
const router = express.Router();
const { getActivityLogs, saveClientLog, getClientLogs } = require('../controllers/logController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Optional auth helper to link logs to users if they are logged in
const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (e) {
      // Ignore auth decoding issues; let logging continue anonymously
    }
  }
  next();
};

router.get('/', protect, requireAdmin, getActivityLogs);
router.post('/client', optionalAuth, saveClientLog);
router.get('/client', protect, requireAdmin, getClientLogs);

module.exports = router;

