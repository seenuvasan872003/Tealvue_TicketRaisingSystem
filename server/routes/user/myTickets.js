// ============================================================
//  server/routes/user/myTickets.js  —  User Ticket Routes
// ============================================================

const express    = require('express');
const router     = express.Router();
const { guardRoute } = require('../../middleware/guardRoute');
const { getTickets, getTicketById } = require('../../controllers/ticketController');
const { submitFeedback, getPendingFeedback, dismissFeedback } = require('../../controllers/feedbackController');
const { reopenTicket } = require('../../controllers/reopenController');

// ── My Tickets ────────────────────────────────────────────
router.get('/tickets/my',          ...guardRoute('my_tickets'), getTickets);
router.get('/tickets/my/:id',      ...guardRoute('my_tickets'), getTicketById);

// ── Feedback ──────────────────────────────────────────────
router.post('/tickets/my/feedback',                    ...guardRoute('my_tickets'), submitFeedback);
router.get ('/tickets/my/feedback/pending',           ...guardRoute('my_tickets'), getPendingFeedback);
router.put ('/tickets/my/feedback/:ticketId/dismiss', ...guardRoute('my_tickets'), dismissFeedback);

// ── Reopen ────────────────────────────────────────────────
router.put('/tickets/my/:id/reopen',       ...guardRoute('my_tickets'), reopenTicket);

module.exports = router;
