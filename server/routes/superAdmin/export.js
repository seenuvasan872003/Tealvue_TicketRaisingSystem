// ============================================================
//  server/routes/superAdmin/export.js  —  Super Admin Export Routes
// ============================================================

const express = require('express');
const router  = express.Router();
const { guardRoute } = require('../../middleware/guardRoute');
const {
  exportTickets,
  exportUsers,
  exportFeedback,
  exportActivityLogs
} = require('../../controllers/exportController');

router.get('/export/tickets',       guardRoute('all_tickets'),        exportTickets);
router.get('/export/users',         guardRoute('all_users'),          exportUsers);
router.get('/export/feedback',      guardRoute('team_dashboard'),     exportFeedback);
router.get('/export/activity-logs', guardRoute('user_activity_logs'), exportActivityLogs);

module.exports = router;
