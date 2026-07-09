// ============================================================
//  server/middleware/authMiddleware.js  —  JWT Auth Guard
// ============================================================
//  Checks (in order):
//    1. Bearer token present in Authorization header
//    2. Token is valid and not expired
//    3. User exists in DB
//    4. User account is active (not suspended)
//    5. User account is approved (not pending Super Admin approval)
// ============================================================
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // [AUTH] Extract token from 'Authorization: Bearer <token>' header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized — no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // [CHECK] Suspended account
    if (!req.user.isActive) {
      return res.status(403).json({ message: 'Account suspended — please contact support' });
    }

    // [CHECK] Security route violations block (24h)
    if (req.user.securityBlockUntil && req.user.securityBlockUntil > new Date()) {
      const remainingMs = req.user.securityBlockUntil.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return res.status(403).json({
        message: `Account temporarily blocked due to multiple unauthorized route violations. Try again in ${remainingHours} hours or contact Super Admin to unblock.`,
        isSecurityBlocked: true,
        blockedUntil: req.user.securityBlockUntil
      });
    }

    // [CHECK] Pending approval (admins created by Super Admin start unapproved)
    if (!req.user.isApproved) {
      return res.status(403).json({ message: 'Account pending approval — please wait for Super Admin approval' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const canEditProfile = async (req, res, next) => {
  const targetId = req.params.id;
  const currentUser = req.user;
  if (currentUser.role === 'super-admin' || currentUser.role === 'admin') return next();
  if (currentUser._id.toString() === targetId) return next();
  return res.status(403).json({ message: 'Access denied. You can only edit your own profile.' });
};

module.exports = { protect, canEditProfile };
