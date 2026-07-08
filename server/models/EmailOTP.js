// ============================================================
//  server/models/EmailOTP.js  —  Email OTP Schema
// ============================================================

const mongoose = require('mongoose');

const emailOTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  hashedOTP: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['register', 'login'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  wrongAttempts: {
    type: Number,
    default: 0
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedAt: {
    type: Date,
    default: null
  },
  blockExpiresAt: {
    type: Date,
    default: null
  },
  resendCount: {
    type: Number,
    default: 0
  },
  lastResendAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

emailOTPSchema.index({ email: 1, type: 1 });
emailOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailOTP', emailOTPSchema);
