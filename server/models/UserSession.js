const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:  { type: String },
  userEmail: { type: String },
  userRole:  { type: String },
  sessionId: { type: String, required: true },
  loginAt:   { type: Date, default: Date.now },
  logoutAt:  { type: Date, default: null },
  duration:  { type: Number, default: null },
  ipAddress: { type: String },
  userAgent: { type: String },
  isActive:  { type: Boolean, default: true },
  logoutType:{ type: String, enum: ['manual','expired','forced'], default: null }
});

userSessionSchema.index({ userId: 1, loginAt: -1 });
userSessionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('UserSession', userSessionSchema);
