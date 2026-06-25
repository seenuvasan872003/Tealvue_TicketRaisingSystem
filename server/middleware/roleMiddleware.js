// ============================================================
//  server/middleware/roleMiddleware.js  —  Role Guards
// ============================================================
//  EXPORTS:
//    requireAdmin          — allows 'admin' AND 'super-admin'
//    requireSuperAdmin     — allows 'super-admin' ONLY
//    requireAdminOrSuperAdmin — alias for requireAdmin (same scope)
// ============================================================

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

module.exports = { requireAdmin, requireSuperAdmin, requireAdminOrSuperAdmin, requireOnlyAdmin };
