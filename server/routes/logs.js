// ============================================================
//  server/routes/logs.js  —  Activity & Client Logs
//  Layer 3 feature guards: requireFeature('feature_id')
// ============================================================

const express = require('express');
const router = express.Router();
const { getActivityLogs, saveClientLog, getClientLogs } = require('../controllers/logController');
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/roleMiddleware');
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

const requireAdminOrSuperAdmin = (req, res, next) => {
  if (req.user && ['admin', 'super-admin'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied — admin or super-admin only' });
};

// Activity logs — feature: activity_logs
router.get('/', protect, requireFeature('activity_logs'), getActivityLogs);

// Client log posting — no feature guard (public-ish, linked to user if logged in)
router.post('/client', optionalAuth, saveClientLog);

// Client logs view — feature: client_logs
router.get('/client', protect, requireFeature('client_logs'), getClientLogs);

module.exports = router;


