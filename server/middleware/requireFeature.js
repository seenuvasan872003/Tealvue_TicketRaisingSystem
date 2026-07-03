const RoleFeature = require('../models/RoleFeature');
const User = require('../models/User');
const ClientLog = require('../models/ClientLog');

const requireFeature = (featureId) => {
  return async (req, res, next) => {
    try {
      const roleFeature = await RoleFeature.findOne({
        userId: req.user._id
      });

      if (!roleFeature) {
        return res.status(403).json({
          success: false,
          code: 'NO_FEATURES',
          message: 'Access denied. No features assigned to this account.'
        });
      }

      if (!roleFeature.features.includes(featureId)) {
        // Enforce flag & logging system on violation
        const user = await User.findById(req.user._id);
        let isBlocked = false;
        let blockUntilDate = null;
        let newFlagsCount = 0;

        if (user) {
          user.securityFlags = (user.securityFlags || 0) + 1;
          newFlagsCount = user.securityFlags;
          if (user.securityFlags >= 5) {
            isBlocked = true;
            blockUntilDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            user.securityBlockUntil = blockUntilDate;
          }
          await user.save();
        }

        const formatTimestamp = () => {
          const now = new Date();
          const dd   = String(now.getDate()).padStart(2, '0');
          const mm   = String(now.getMonth() + 1).padStart(2, '0');
          const yyyy = now.getFullYear();
          const hrs  = now.getHours();
          const mins = String(now.getMinutes()).padStart(2, '0');
          const ampm = hrs >= 12 ? 'PM' : 'AM';
          const h12  = hrs % 12 || 12;
          return `${dd}-${mm}-${yyyy} ${String(h12).padStart(2, '0')}:${mins} ${ampm}`;
        };

        const message = `Unauthorized API Access Attempt on feature: '${featureId}'. User flags count: ${newFlagsCount}/5.${isBlocked ? ' USER BLOCKED FOR 24 HOURS.' : ''}`;

        await ClientLog.create({
          level: 'error',
          timestamp: formatTimestamp(),
          file: 'server/middleware/requireFeature.js',
          component: 'API Route Guard',
          function: 'requireFeature',
          api: req.originalUrl,
          method: req.method,
          status: '403',
          message: message,
          route: req.originalUrl,
          action: 'API_FEATURE_VIOLATION',
          userId: req.user._id,
        });

        return res.status(403).json({
          success: false,
          code: 'FEATURE_NOT_ASSIGNED',
          message: isBlocked
            ? `Access denied. Multiple unauthorized route violations detected. Your account has been temporarily blocked for 24 hours.`
            : `Access denied. You do not have the '${featureId}' feature. (Warning: flag ${newFlagsCount}/5)`,
          feature: featureId,
          flags: newFlagsCount,
          isBlocked: isBlocked
        });
      }

      next();
    } catch (err) {
      console.error('requireFeature middleware error:', err);
      return res.status(500).json({
        success: false,
        code: 'FEATURE_CHECK_FAILED',
        message: 'Permission check failed. Please try again.'
      });
    }
  };
};

module.exports = { requireFeature };
