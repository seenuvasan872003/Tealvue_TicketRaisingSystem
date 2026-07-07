const { logActivity } = require('../utils/logActivity');
const UserTriggerSummary = require('../models/UserTriggerSummary');

const trackActivity = async (req, res, next) => {
  const start = Date.now();

  res.on('finish', async () => {
    if (!req.user) return;
    const responseTime = Date.now() - start;
    try {
      await logActivity({
        userId:    req.user._id,
        userName:  req.user.name,
        userEmail: req.user.email,
        userRole:  req.user.role,
        eventType: 'API_TRIGGER',
        details: {
          method:       req.method,
          route:        req.originalUrl,
          statusCode:   res.statusCode,
          userAgent:    req.headers['user-agent'],
          ipAddress:    req.ip || req.headers['x-forwarded-for'],
          sessionId:    req.user.sessionId || null,
          responseTime: responseTime,
          featureId:    req.featureId || null
        }
      });

      await UserTriggerSummary.findOneAndUpdate(
        { userId: req.user._id },
        { $set: { lastActiveAt: new Date() }, $inc: { totalTriggers: 1 } },
        { upsert: true }
      );
    } catch (err) {
      console.error('[trackActivity] Error:', err.message);
    }
  });

  next();
};

module.exports = { trackActivity };
