// ============================================================
//  server/routes/admin/export.js  —  Admin Export Routes
// ============================================================

const express = require('express');
const router  = express.Router();
const { guardRoute } = require('../../middleware/guardRoute');
const {
  exportTickets,
  exportUsers,
  exportFeedback
} = require('../../controllers/exportController');

router.get('/export/tickets',  guardRoute('all_tickets'),    exportTickets);
router.get('/export/users',    guardRoute('all_users'),      exportUsers);
router.get('/export/feedback', guardRoute('feedback_report'), exportFeedback);

module.exports = router;
