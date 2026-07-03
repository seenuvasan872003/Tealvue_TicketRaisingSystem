const FEATURES = require('../config/featureList');

const requirePathOwnership = (featureId) => {
  return (req, res, next) => {
    const role        = req.user?.role;
    const feature     = FEATURES.find(f => f.id === featureId);
    const requestPath = req.originalUrl.split('?')[0];

    if (!feature) {
      return res.status(403).json({
        success: false,
        code: 'FEATURE_NOT_FOUND',
        message: 'Access denied. Feature configuration not found.'
      });
    }

    let allowedApiPath = feature.apiPaths[role];
    if (!allowedApiPath && role === 'super-admin') {
      allowedApiPath = feature.apiPaths['super_admin'];
    }

    if (!allowedApiPath) {
      return res.status(403).json({
        success: false,
        code: 'NO_PATH_FOR_ROLE',
        message: `Access denied. Feature '${featureId}' has no allowed path for role '${role}'.`
      });
    }

    if (!requestPath.startsWith(allowedApiPath)) {
      return res.status(403).json({
        success: false,
        code: 'WRONG_PATH',
        message: 'Access denied. This endpoint does not match your allowed path for this feature.'
      });
    }

    next();
  };
};

module.exports = { requirePathOwnership };
