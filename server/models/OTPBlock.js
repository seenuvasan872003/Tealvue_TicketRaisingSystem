// ============================================================
//  server/models/OTPBlock.js  —  OTP Block Record Schema
// ============================================================

const mongoose = require('mongoose');

const otpBlockSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  blockedAt: {
    type: Date,
    required: true
  },
  blockExpiresAt: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    default: 'Too many wrong OTP attempts'
  },
  attemptCount: {
    type: Number,
    default: 5
  }
});

otpBlockSchema.index({ email: 1 });
otpBlockSchema.index({ blockExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTPBlock', otpBlockSchema);
