const mongoose = require('mongoose');

const userActivityLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:  { type: String },
  userEmail: { type: String },
  userRole:  { type: String, enum: ['user','admin','super-admin','team_admin','team_user'] },
  eventType: {
    type: String,
    required: true,
    enum: ['LOGIN','LOGOUT','API_TRIGGER','ROUTE_ACCESS','FEATURE_ACCESS','FAILED_LOGIN','UNAUTHORIZED_ATTEMPT']
  },
  triggerCount: { type: Number, default: 1 },
  details: {
    method:       { type: String },
    route:        { type: String },
    featureId:    { type: String },
    statusCode:   { type: Number },
    userAgent:    { type: String },
    ipAddress:    { type: String },
    sessionId:    { type: String },
    responseTime: { type: Number },
    note:         { type: String }
  },
  timestamp: { type: Date, default: Date.now, required: true }
});

userActivityLogSchema.index({ userId: 1, timestamp: -1 });
userActivityLogSchema.index({ eventType: 1, timestamp: -1 });
userActivityLogSchema.index({ 'details.route': 1 });

module.exports = mongoose.model('UserActivityLog', userActivityLogSchema);
