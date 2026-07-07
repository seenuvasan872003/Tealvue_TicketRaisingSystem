const express = require('express');
const router  = express.Router();
const { guardRoute } = require('../../middleware/guardRoute');
const { getAllFeedback, getTeamFeedback } = require('../../controllers/feedbackController');
const { clearUserFlags, clearTicketReopen } = require('../../controllers/reopenController');

router.get('/feedback',                         guardRoute('feedback_report'), getAllFeedback);
router.get('/feedback/team/:teamId',            guardRoute('feedback_report'), getTeamFeedback);

// Flag management
router.put('/users/:id/clear-flags',            guardRoute('all_users'),    clearUserFlags);
router.put('/tickets/:id/clear-reopen',         guardRoute('all_tickets'),  clearTicketReopen);

module.exports = router;

