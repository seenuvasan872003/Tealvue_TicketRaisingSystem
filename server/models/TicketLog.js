// ============================================================
//  server/models/TicketLog.js  —  Ticket Lifecycle Log Schema
// ============================================================

const mongoose = require('mongoose');

const ticketLogSchema = new mongoose.Schema(
  {
    ticketId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Ticket',
      required: true,
    },
    action: {
      type:     String,
      required: true,
      enum: [
        'TICKET_CREATED',
        'TICKET_AUTO_ALLOCATED_TEAM',
        'TICKET_MANUALLY_ALLOCATED_TEAM',
        'TICKET_REALLOCATED_TEAM',
        'PRIORITY_CHANGED',
        'DUE_DATE_SET',
        'DUE_DATE_UPDATED',
        'TICKET_SUSPENDED',
        'TICKET_RESTORED',
        'TICKET_REJECTED',
        'TICKET_ASSIGNED_TO_MEMBER',
        'TICKET_REASSIGNED_TO_MEMBER',
        'TICKET_OPENED',
        'TICKET_IN_PROGRESS',
        'TICKET_CLOSED',
        'COMMENT_ADDED',
        'ATTACHMENT_FLAGGED',
        // New Revised Allocation actions
        'AUTO_ALLOCATED_TEAM_ADMIN',
        'AUTO_ALLOCATED_TO_ADMIN_NO_CATEGORY',
        'AUTO_ALLOCATED_TEAM_USER_AFTER_TIMEOUT',
        'ALLOCATED_TO_TEAM_USER_BY_TEAM_ADMIN',
        'REALLOCATED_TO_OTHER_TEAM_BY_TEAM_ADMIN',
        'REALLOCATED_TO_OTHER_TEAM_BY_TEAM_USER',
        'TRANSFERRED_TO_ADMIN_BY_TEAM_ADMIN',
        'TRANSFERRED_TO_ADMIN_BY_TEAM_USER',
        'CATEGORY_SET_BY_ADMIN',
        'TICKET_DECLINED_BY_ADMIN',
        'TICKET_CLOSED_BY_TEAM_USER'
      ]
    },
    performedBy: {
      userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
      },
      name:  { type: String },
      email: { type: String },
      role: {
        type: String,
        enum: ['user', 'admin', 'super-admin', 'team_admin', 'team_user', 'system'],
      }
    },
    timestamp: {
      type:    Date,
      default: Date.now,
      required: true,
    },
    metadata: {
      previousValue:      { type: String, default: null },
      newValue:           { type: String, default: null },
      teamId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
      teamName:           { type: String, default: null },
      assignedToUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      assignedToUserName: { type: String, default: null },
      note:               { type: String, default: null },
    }
  }
);

// Indexes for fast querying
ticketLogSchema.index({ ticketId: 1, timestamp: 1 });
ticketLogSchema.index({ 'performedBy.userId': 1 });

module.exports = mongoose.model('TicketLog', ticketLogSchema);
