const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { getTickets } = require('../../controllers/ticketController');
const { protect } = require('../../middleware/authMiddleware');
const { requireAdmin, requireFeature } = require('../../middleware/roleMiddleware');

router.get('/tickets', ...guardRoute('all_tickets'), getTickets);

module.exports = router;
