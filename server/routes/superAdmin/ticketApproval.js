const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { 
  getAllTicketsAdmin, 
  suspendTicket, 
  rejectTicket, 
  restoreTicket,
  bulkModerateTickets
} = require('../../controllers/ticketController');
const { protect } = require('../../middleware/authMiddleware');
const { requireFeature } = require('../../middleware/roleMiddleware');

router.get('/tickets/approval', ...guardRoute('ticket_approval'), getAllTicketsAdmin);
router.put('/tickets/approval/bulk-moderate', ...guardRoute('ticket_approval'), bulkModerateTickets);
router.put('/tickets/approval/:id/suspend', ...guardRoute('ticket_approval'), suspendTicket);
router.put('/tickets/approval/:id/reject', ...guardRoute('ticket_approval'), rejectTicket);
router.put('/tickets/approval/:id/restore', ...guardRoute('ticket_approval'), restoreTicket);

module.exports = router;
