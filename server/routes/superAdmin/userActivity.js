const express = require('express');
const router  = express.Router();
const { guardRoute } = require('../../middleware/guardRoute');
const {
  getAllActivity, getUserActivity, getUserSummary,
  getAllSessions, getUserSessions, getDashboardStats, getAllTrackedUsers
} = require('../../controllers/userActivityController');

// Dashboard stats
router.get('/stats',          ...guardRoute('user_activity_logs'), getDashboardStats);

// All tracked users list
router.get('/users',          ...guardRoute('user_activity_logs'), getAllTrackedUsers);

// All activity logs (paginated, filterable)
router.get('/',               ...guardRoute('user_activity_logs'), getAllActivity);

// All sessions
router.get('/sessions',       ...guardRoute('user_activity_logs'), getAllSessions);

// Specific user
router.get('/:uid',           ...guardRoute('user_activity_logs'), getUserActivity);
router.get('/:uid/summary',   ...guardRoute('user_activity_logs'), getUserSummary);
router.get('/:uid/sessions',  ...guardRoute('user_activity_logs'), getUserSessions);

module.exports = router;
