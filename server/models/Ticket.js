// ============================================================
//  server/models/Ticket.js  —  Ticket Schema
// ============================================================
//  NEW FIELDS (Phase 1 upgrade):
//    priority:       added 'urgent' to enum
//    due_date:       optional Date
//    attachments:    array of uploaded file metadata
//    internal_notes: admin/super-admin only notes (hidden from users)
//    status_history: auto-recorded status change log
// ============================================================

const mongoose = require('mongoose');

// ── Sub-schema: Attachment ────────────────────────────────
const attachmentSchema = new mongoose.Schema({
  filename:     { type: String, required: true },   // stored filename on disk
  originalName: { type: String, required: true },   // original upload name
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },   // bytes
  url:          { type: String, required: true },   // accessible URL path
}, { _id: true });

// ── Sub-schema: Internal Note (Admin/Super Admin only) ────
const internalNoteSchema = new mongoose.Schema({
  text:   { type: String, required: true, trim: true, maxlength: 2000 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// ── Sub-schema: Status History ────────────────────────────
const statusHistorySchema = new mongoose.Schema({
  from:      { type: String },
  to:        { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

// ── Main Ticket Schema ────────────────────────────────────
const ticketSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      required:  [true, 'Title is required'],
      trim:      true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type:      String,
      required:  [true, 'Description is required'],
      trim:      true,
      minlength: 10,
    },
    category: {
      type:    String,
      required: false,
      enum:    ['General', 'Technical', 'Billing', 'HR', 'Other', null],
      default: null,
    },
    // priority: low | medium | high | urgent
    priority: {
      type:    String,
      enum:    ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type:    String,
      enum:    ['open', 'in-progress', 'closed'],
      default: 'open',
    },

    // ── New Revised Allocation Fields ───────────────────
    allocationStatus: {
      type: String,
      enum: [
        'pending_admin',
        'allocated_team_admin',
        'allocated_team_user',
        'reallocated_team',
        'transferred_to_admin',
        'declined'
      ],
      default: 'pending_admin'
    },
    categorySelectedByUser:   { type: Boolean, default: false },
    teamAdminViewedAt:        { type: Date, default: null },
    teamAdminAllocatedAt:     { type: Date, default: null },
    teamUserAllocatedAt:      { type: Date, default: null },
    autoAllocatedAt:          { type: Date, default: null },
    reallocatedFromTeamId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    reallocatedByRole:        { type: String, default: null },
    transferredToAdminAt:     { type: Date, default: null },
    transferredToAdminReason: { type: String, default: null },

    // ── Dates ───────────────────────────────────────────
    dueDate: {
      type:    Date,
      default: null,
    },

    // ── Relations ────────────────────────────────────────
    user_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    assigned_to: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    // ── Attachments ──────────────────────────────────────
    // Multiple files — images get thumbnails, others get file-icon display
    attachments: [attachmentSchema],

    // ── Internal Notes (hidden from Users) ───────────────
    internal_notes: [internalNoteSchema],

    // ── Status History ────────────────────────────────────
    // Auto-populated on every status change (including auto-transition)
    status_history: [statusHistorySchema],

    // ── Team Allocation ──────────────────────────────────
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    assignedToUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    allocatedAt: {
      type: Date,
      default: null,
    },
    autoAllocated: {
      type: Boolean,
      default: false,
    },

    // ── Approval & Moderation Management ───────────────────
    approvalStatus: {
      type: String,
      enum: ['approved', 'suspended', 'rejected'],
      default: 'approved'
    },
    moderatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt:    { type: Date, default: null },
    moderationNote: { type: String, default: '' },
    lastAdminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── Time Tracking ───────────────────────────────────
    timeTracking: {
      createdAt:        { type: Date, default: Date.now },
      allocatedAt:      { type: Date, default: null },
      memberAssignedAt: { type: Date, default: null },
      inProgressAt:     { type: Date, default: null },
      closedAt:         { type: Date, default: null },
      
      timeToAllocate:   { type: Number, default: null },
      timeToAssign:     { type: Number, default: null },
      timeToClose:      { type: Number, default: null },
      timeInProgress:   { type: Number, default: null },
    },
  },
  { timestamps: true }
);

// ── Pre-Validate Hook to Normalize Legacy/Invalid Values ──
ticketSchema.pre('validate', function(next) {
  if (this.category) {
    const cat = this.category.toLowerCase().trim();
    if (cat === 'technical' || cat === 'feature-request' || cat === 'bug') {
      this.category = 'Technical';
    } else if (cat === 'billing') {
      this.category = 'Billing';
    } else if (cat === 'general') {
      this.category = 'General';
    } else if (cat === 'hr') {
      this.category = 'HR';
    } else if (cat === 'other') {
      this.category = 'Other';
    }
  }
  
  if (this.priority) {
    const prio = this.priority.toLowerCase().trim();
    if (!['low', 'medium', 'high', 'urgent'].includes(prio)) {
      this.priority = 'low';
    }
  } else {
    this.priority = 'low';
  }

  if (!this.approvalStatus) {
    this.approvalStatus = 'approved';
  }
  
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
