const express = require('express');
const router  = express.Router();
const { guardRoute } = require('../../middleware/guardRoute');
const User = require('../../models/User');
const {
  getAllActivity, getUserActivity, getUserSummary,
  getUserSessions, getDashboardStats, getAllTrackedUsers
} = require('../../controllers/userActivityController');

const ALLOWED_ROLES = ['user', 'team_admin', 'team_user'];

// Inject role restriction middleware
const restrictRoles = (req, res, next) => {
  req.restrictRoles = ALLOWED_ROLES;
  next();
};

// Validate the target userId belongs to an allowed role
const validateTargetRole = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.uid).select('role');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (!ALLOWED_ROLES.includes(targetUser.role)) {
      return res.status(403).json({ message: 'Access denied — cannot view logs for this role' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.get('/stats',         ...guardRoute('user_activity_logs'), getDashboardStats);
router.get('/users',         ...guardRoute('user_activity_logs'), restrictRoles, getAllTrackedUsers);
router.get('/',              ...guardRoute('user_activity_logs'), restrictRoles, getAllActivity);
router.get('/:uid',          ...guardRoute('user_activity_logs'), validateTargetRole, getUserActivity);
router.get('/:uid/summary',  ...guardRoute('user_activity_logs'), validateTargetRole, getUserSummary);
router.get('/:uid/sessions', ...guardRoute('user_activity_logs'), validateTargetRole, getUserSessions);

module.exports = router;
