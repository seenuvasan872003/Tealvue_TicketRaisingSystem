// ============================================================
//  server/middleware/roleMiddleware.js  —  Role Guards
// ============================================================
//  EXPORTS:
//    requireAdmin             — allows 'admin' AND 'super-admin'
//    requireSuperAdmin        — allows 'super-admin' ONLY
//    requireAdminOrSuperAdmin — alias for requireAdmin (same scope)
//    requireOnlyAdmin         — allows 'admin' ONLY (blocks super-admin)
//    requireFeature(id)       — Layer 3: checks RoleFeature DB doc for featureId
// ============================================================

const RoleFeature = require('../models/RoleFeature');

// @desc  Allow both admin and super-admin
const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super-admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied — admins only' });
};

// @desc  Allow super-admin only
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'super-admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied — super admins only' });
};

// Alias — same as requireAdmin, explicit naming for readability
const requireAdminOrSuperAdmin = requireAdmin;

// @desc  Allow standard admin only (block super-admin)
const requireOnlyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied — standard admins only' });
};

// ============================================================
//  requireFeature(featureId)  —  Layer 3 Feature Guard
// ============================================================
//  Factory middleware — checks the user's RoleFeature document
//  in the database for the given featureId.
//  Returns 403 if the feature is NOT in the user's features array.
//  This is the final, backend enforcement of the permission system.
//  Works for ALL roles including super-admin (consistent with DB state).
// ============================================================
const requireFeature = (featureId) => async (req, res, next) => {
  try {
    const doc = await RoleFeature.findOne({ userId: req.user._id }).lean();
    const features = doc?.features || [];
    if (features.includes(featureId)) {
      return next();
    }

    // ── Enforce Flag & Logging System on Violation ──
    const User = require('../models/User');
    const ClientLog = require('../models/ClientLog');

    // 1. Increment security flags in DB
    const user = await User.findById(req.user._id);
    let isBlocked = false;
    let blockUntilDate = null;
    let newFlagsCount = 0;

    if (user) {
      user.securityFlags = (user.securityFlags || 0) + 1;
      newFlagsCount = user.securityFlags;
      if (user.securityFlags >= 5) {
        isBlocked = true;
        // Block for 24 hours
        blockUntilDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        user.securityBlockUntil = blockUntilDate;
      }
      await user.save();
    }

    const message = `Unauthorized API Access Attempt on feature: '${featureId}'. User flags count: ${newFlagsCount}/5.${isBlocked ? ' USER BLOCKED FOR 24 HOURS.' : ''}`;

    // 2. Write client-style log to DB
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

    await ClientLog.create({
      level: 'error',
      timestamp: formatTimestamp(),
      file: 'server/middleware/roleMiddleware.js',
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
      message: isBlocked 
        ? `Access denied. Multiple unauthorized route violations detected. Your account has been temporarily blocked for 24 hours.`
        : `Access denied — feature '${featureId}' is not enabled for your account. (Warning: flag ${newFlagsCount}/5)`,
      feature: featureId,
      flags: newFlagsCount,
      isBlocked: isBlocked
    });
  } catch (err) {
    console.error('requireFeature middleware error:', err);
    return res.status(500).json({ message: 'Feature check failed — internal error' });
  }
};

module.exports = { requireAdmin, requireSuperAdmin, requireAdminOrSuperAdmin, requireOnlyAdmin, requireFeature };
