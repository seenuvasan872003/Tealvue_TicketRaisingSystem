const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { getAllTicketLogs } = require('../../controllers/ticketController');
const { protect } = require('../../middleware/authMiddleware');
const { requireAdmin, requireFeature } = require('../../middleware/roleMiddleware');

router.get('/ticket-logs', ...guardRoute('ticket_lifecycle_logs'), getAllTicketLogs);

module.exports = router;
