const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { getMyStats } = require('../../controllers/ticketController');
const { protect } = require('../../middleware/authMiddleware');
const { requireFeature } = require('../../middleware/roleMiddleware');
router.get('/tickets/states', ...guardRoute('ticket_states'), getMyStats);

module.exports = router;
