const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { createTicket } = require('../../controllers/ticketController');
const { protect } = require('../../middleware/authMiddleware');
const { requireFeature } = require('../../middleware/roleMiddleware');
const { uploadTicketFiles } = require('../../config/multer');
const { ticketValidator } = require('../../middleware/validationMiddleware');

router.post('/tickets', ...guardRoute('create_ticket'), uploadTicketFiles, ticketValidator, createTicket);

module.exports = router;
