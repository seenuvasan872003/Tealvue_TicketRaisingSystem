// ============================================================
//  server/controllers/reopenController.js
// ============================================================

const Ticket      = require('../models/Ticket');
const User        = require('../models/User');
const TicketLog   = require('../models/TicketLog');
const Notification = require('../models/Notification');

// ── Reopen Ticket ─────────────────────────────────────────────
const reopenTicket = async (req, res) => {
  try {
    const { id }    = req.params;
    const { reason } = req.body;
    const userId    = req.user._id;
    const reqUser   = req.user;

    // Validate reason
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ message: 'Reason must be at least 10 characters' });
    }
    if (reason.trim().length > 500) {
      return res.status(400).json({ message: 'Reason must be 500 characters or less' });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (String(ticket.user_id) !== String(userId)) {
      return res.status(403).json({ message: 'You can only reopen your own tickets' });
    }
    if (ticket.status !== 'closed') {
      return res.status(400).json({ message: 'Only closed tickets can be reopened' });
    }
    if (ticket.isDeclinedByReopen) {
      return res.status(403).json({ message: 'This ticket has been declined and cannot be reopened' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check flag count — auto-decline if >= 3
    if (user.reopenFlagCount >= 3) {
      ticket.status              = 'closed';
      ticket.isDeclinedByReopen  = true;
      ticket.approvalStatus      = 'rejected';
      await ticket.save();

      await TicketLog.create({
        ticketId: ticket._id,
        action: 'TICKET_DECLINED_REOPEN_LIMIT',
        performedBy: { userId: reqUser._id, name: reqUser.name, email: reqUser.email, role: reqUser.role },
        metadata: { note: `Auto-declined: user flagged ${user.reopenFlagCount} times` }
      });

      // Notify user
      await Notification.create({
        recipientId: userId,
        senderId:    userId,
        senderName:  'Tealvue',
        senderRole:  'system',
        type:        'TICKET_DECLINED_AUTO',
        ticketId:    ticket._id,
        ticketTitle: ticket.title,
        message:     `Your ticket "${ticket.title}" has been declined due to multiple reopen attempts.`
      });

      return res.status(403).json({
        message: 'Ticket cannot be reopened. Your account has been flagged multiple times.',
        isDeclinedByReopen: true
      });
    }

    // Proceed with reopen
    const previousReopenCount = ticket.reopenCount || 0;
    ticket.status             = 'open';
    ticket.allocationStatus   = 'allocated_team_admin';
    ticket.assignedToUser     = null;
    ticket.teamAdminViewedAt  = null;
    ticket.autoAllocatedAt    = new Date();
    ticket.feedbackStatus     = null;
    ticket.closedAt           = null;
    ticket.reopenCount        = previousReopenCount + 1;
    ticket.reopenHistory.push({
      reopenedAt: new Date(),
      reason:     reason.trim(),
      userId
    });

    // If this is 2nd+ reopen — flag the user
    if (previousReopenCount >= 1) {
      user.reopenFlagCount = (user.reopenFlagCount || 0) + 1;
      await user.save();

      await TicketLog.create({
        ticketId: ticket._id,
        action: 'TICKET_FLAG_ADDED',
        performedBy: { userId: reqUser._id, name: reqUser.name, email: reqUser.email, role: reqUser.role },
        metadata: { note: `User flag count is now ${user.reopenFlagCount}` }
      });
    }

    await ticket.save();

    // Log the reopen
    await TicketLog.create({
      ticketId: ticket._id,
      action: 'TICKET_REOPENED',
      performedBy: { userId: reqUser._id, name: reqUser.name, email: reqUser.email, role: reqUser.role },
      metadata: { note: reason.trim() }
    });

    // Notify team admin if assigned
    if (ticket.teamId) {
      const Team = require('../models/Team');
      const team = await Team.findById(ticket.teamId).populate('teamAdmin', '_id');
      if (team?.teamAdmin?._id) {
        await Notification.create({
          recipientId: team.teamAdmin._id,
          senderId:    userId,
          senderName:  reqUser.name,
          senderRole:  'user',
          type:        'TICKET_REOPENED',
          ticketId:    ticket._id,
          ticketTitle: ticket.title,
          message:     `Ticket "${ticket.title}" has been reopened by the user. Reason: ${reason.trim()}`
        });
      }
    }

    res.json({
      message: 'Ticket reopened successfully',
      ticket: { _id: ticket._id, status: ticket.status, reopenCount: ticket.reopenCount }
    });
  } catch (err) {
    console.error('[REOPEN] reopenTicket error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── Clear user flags (admin) ──────────────────────────────────
const clearUserFlags = async (req, res) => {
  try {
    const { id } = req.params;
    const user   = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.reopenFlagCount = 0;
    await user.save();
    res.json({ message: 'User flags cleared successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Clear ticket reopen history (admin) ───────────────────────
const clearTicketReopen = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    ticket.reopenCount        = 0;
    ticket.reopenHistory      = [];
    ticket.isDeclinedByReopen = false;
    await ticket.save();
    res.json({ message: 'Ticket reopen history cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { reopenTicket, clearUserFlags, clearTicketReopen };
