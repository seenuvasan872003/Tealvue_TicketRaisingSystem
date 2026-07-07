const UserActivityLog    = require('../models/UserActivityLog');
const UserTriggerSummary = require('../models/UserTriggerSummary');

const logActivity = async ({ userId, userName, userEmail, userRole, eventType, details = {} }) => {
  try {
    await UserActivityLog.create({
      userId, userName, userEmail, userRole, eventType,
      details: {
        method:       details.method       || null,
        route:        details.route        || null,
        featureId:    details.featureId    || null,
        statusCode:   details.statusCode   || null,
        userAgent:    details.userAgent    || null,
        ipAddress:    details.ipAddress    || null,
        sessionId:    details.sessionId    || null,
        responseTime: details.responseTime || null,
        note:         details.note         || null
      }
    });

    await UserTriggerSummary.findOneAndUpdate(
      { userId },
      { $set: { userName, userRole, lastActiveAt: new Date() }, $inc: { totalTriggers: 1 } },
      { upsert: true }
    );
  } catch (err) {
    // Never crash the caller
    console.error('[logActivity] Error:', err.message);
  }
};

module.exports = { logActivity };
