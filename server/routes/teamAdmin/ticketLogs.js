const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const Team = require('../../models/Team');
const Ticket = require('../../models/Ticket');
const TicketLog = require('../../models/TicketLog');
const { protect } = require('../../middleware/authMiddleware');
const { requireFeature } = require('../../middleware/roleMiddleware');

router.get('/ticket-logs', ...guardRoute('ticket_lifecycle_logs'), async (req, res) => {
  try {
    const team = await Team.findOne({ teamAdmin: req.user._id });
    if (!team) return res.json([]);

    const tickets = await Ticket.find({ teamId: team._id });
    const ticketIds = tickets.map(t => t._id);

    const logs = await TicketLog.find({ ticketId: { $in: ticketIds } })
      .populate('ticketId', 'title')
      .sort({ timestamp: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
