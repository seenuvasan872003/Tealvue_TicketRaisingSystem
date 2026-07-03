const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { getTickets } = require('../../controllers/ticketController');
const { protect } = require('../../middleware/authMiddleware');
const { requireFeature } = require('../../middleware/roleMiddleware');
router.get('/tickets/my', ...guardRoute('my_tickets'), getTickets);

module.exports = router;
