const mongoose = require('mongoose');

const userTriggerSummarySchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  userName:      { type: String },
  userRole:      { type: String },
  totalLogins:   { type: Number, default: 0 },
  totalLogouts:  { type: Number, default: 0 },
  totalTriggers: { type: Number, default: 0 },
  lastLoginAt:   { type: Date, default: null },
  lastLogoutAt:  { type: Date, default: null },
  lastActiveAt:  { type: Date, default: null },
  topRoutes: [{
    route: String,
    count: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('UserTriggerSummary', userTriggerSummarySchema);
