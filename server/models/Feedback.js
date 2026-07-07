// ============================================================
//  server/models/Feedback.js  —  User Feedback Schema
// ============================================================

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  ticketId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket',  required: true, unique: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  teamId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Team',    required: true },
  teamUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  rating:      { type: Number, required: true, min: 1, max: 5 },
  comment:     { type: String, maxlength: 300, default: '' },
  submittedAt:  { type: Date, default: Date.now },
  promptSentAt: { type: Date, default: null },
  isSubmitted:  { type: Boolean, default: false },
  isDismissed:  { type: Boolean, default: false }
}, { timestamps: true });

feedbackSchema.index({ teamId: 1 });
feedbackSchema.index({ userId: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
