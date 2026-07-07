const express = require('express');
const router  = express.Router();
const { guardRoute } = require('../../middleware/guardRoute');
const {
  getAllActivity, getUserActivity, getUserSummary,
  getAllSessions, getUserSessions, getDashboardStats, getAllTrackedUsers
} = require('../../controllers/userActivityController');

// Dashboard stats
router.get('/stats',          ...guardRoute('client_logs'), getDashboardStats);

// All tracked users list
router.get('/users',          ...guardRoute('client_logs'), getAllTrackedUsers);

// All activity logs (paginated, filterable)
router.get('/',               ...guardRoute('client_logs'), getAllActivity);

// All sessions
router.get('/sessions',       ...guardRoute('client_logs'), getAllSessions);

// Specific user
router.get('/:uid',           ...guardRoute('client_logs'), getUserActivity);
router.get('/:uid/summary',   ...guardRoute('client_logs'), getUserSummary);
router.get('/:uid/sessions',  ...guardRoute('client_logs'), getUserSessions);

module.exports = router;
