const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'TICKET_CREATED',
        'TICKET_ASSIGNED',
        'TICKET_CLOSED',
        'STATUS_UPDATED',
        'AUTO_ALLOCATED',
        'ADMIN_CREATED',
        'TEAM_CREATED',
        'TEAM_UPDATED',
        'USER_LOGIN',
        'TICKET_SUSPENDED',
        'TICKET_REJECTED',
        'TICKET_RESTORED',
        'USER_CREATED',
      ],
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    note: {
      type: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
