const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { getAllTicketsAdmin } = require('../../controllers/ticketController');
const { protect } = require('../../middleware/authMiddleware');
const { requireSuperAdmin, requireFeature } = require('../../middleware/roleMiddleware');

router.get('/tickets', ...guardRoute('all_tickets'), getAllTicketsAdmin);

module.exports = router;
