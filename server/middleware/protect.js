// This middleware checks if jwt token is valid
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if token is provided
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code: 'NO_TOKEN',
        message: 'Access denied. No token provided.'
      });
    }

    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Access denied. User not found.'
      });
    }

    // Check if account is suspended
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account suspended — please contact support'
      });
    }

    // Check if account is pending approval
    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        code: 'PENDING_APPROVAL',
        message: 'Account pending approval — please wait for Super Admin approval'
      });
    }

    // Check if account is security blocked
    if (user.securityBlockUntil && user.securityBlockUntil > new Date()) {
      const remainingMs = user.securityBlockUntil.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return res.status(403).json({
        success: false,
        code: 'SECURITY_BLOCKED',
        message: `Account temporarily blocked due to multiple unauthorized route violations. Try again in ${remainingHours} hours or contact Super Admin to unblock.`,
        isSecurityBlocked: true,
        blockedUntil: user.securityBlockUntil
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Access denied. Invalid or expired token.'
    });
  }
};

module.exports = { protect };
