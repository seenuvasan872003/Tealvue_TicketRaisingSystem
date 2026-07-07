// ============================================================
//  server/controllers/authController.js
// ============================================================
//  ROUTES:
//    POST /api/auth/register    → register()
//    POST /api/auth/login       → login()
//    GET  /api/auth/profile     → getProfile()   [JWT required]
//    PUT  /api/auth/profile     → updateProfile() [JWT required, own profile only]
//
//  PASSWORD POLICY (server-side enforced):
//    - Min 8 characters
//    - At least 1 uppercase letter
//    - At least 1 number
//    - At least 1 special character (!@#$%^&* etc.)
//
//  INPUT SANITIZATION:
//    - Name/text fields: strip < > { } $ % ^ * characters
//    - Email: validated by mongoose schema regex
// ============================================================

const jwt          = require('jsonwebtoken');
const crypto       = require('crypto');
const path         = require('path');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const UserSession  = require('../models/UserSession');
const UserTriggerSummary = require('../models/UserTriggerSummary');
const { logActivity } = require('../utils/logActivity');
const { isWhitelisted } = require('../utils/whitelist');

// ── Helpers ─────────────────────────────────────────────

const generateToken = (id, sessionId) =>
  jwt.sign({ id, sessionId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// Validate password strength
const validatePassword = (password) => {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password))          return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password))          return 'Password must contain at least one number';
  if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(password))
    return 'Password must contain at least one special character';
  return null;
};

// Strip dangerous characters from text input
const sanitizeText = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>{}\$%\^*]/g, '').trim();
};

// Build safe user response object
const userResponse = (user) => ({
  _id:                user._id,
  name:               user.name,
  email:              user.email,
  role:               user.role,
  isApproved:         user.isApproved,
  isActive:           user.isActive,
  avatar:             user.avatar,
  department:         user.department,
  securityFlags:      user.securityFlags || 0,
  securityBlockUntil: user.securityBlockUntil || null,
  createdAt:          user.createdAt,
});

// ── Register ──────────────────────────────────────────────
// @desc  Register new user (public signup — always creates 'user' role)
// @route POST /api/auth/register
// @access Public
const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // Sanitize
    name  = sanitizeText(name);
    email = (email || '').toLowerCase().trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Password strength
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ message: pwError });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    if (!isWhitelisted(email)) {
      return res.status(403).json({ message: 'Not authorised to register' });
    }

    // Public registration is ALWAYS 'user' role,
    const user = await User.create({
      name,
      email,
      password,
      role:       'user',
      isApproved: true,
      isActive:   true,
    });

    const token = generateToken(user._id);

    // Auto-create feature assignment with user role defaults
    try {
      const RoleFeature   = require('../models/RoleFeature');
      const ROLE_DEFAULTS = require('../config/roleDefaults');
      const defaults = ROLE_DEFAULTS['user'] || ['dashboard'];
      await RoleFeature.create({ userId: user._id, role: 'user', features: defaults });
    } catch (rfErr) {
      console.error('[RoleFeature] Failed to auto-create on register:', rfErr.message);
    }

    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Login ─────────────────────────────────────────────
// @desc  Login user
// @route POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      // Log failed login attempt for email
      try {
        await logActivity({
          userId: null, userName: email, userEmail: email, userRole: null,
          eventType: 'FAILED_LOGIN',
          details: { route: '/api/auth/login', method: 'POST', note: 'User not found', ipAddress: req.ip || req.headers['x-forwarded-for'], userAgent: req.headers['user-agent'] }
        });
      } catch (_) {}
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check account status before password match to give clear messages
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account suspended — please contact support' });
    }
    if (!user.isApproved) {
      return res.status(403).json({ message: 'Account pending approval — please wait for Super Admin approval' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      try {
        await logActivity({
          userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
          eventType: 'FAILED_LOGIN',
          details: { route: '/api/auth/login', method: 'POST', note: 'Wrong credentials', ipAddress: req.ip || req.headers['x-forwarded-for'], userAgent: req.headers['user-agent'] }
        });
      } catch (_) {}
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate unique sessionId and embed in JWT
    const sessionId = crypto.randomUUID();
    const token = generateToken(user._id, sessionId);
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    // Create session record
    try {
      await UserSession.create({
        userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
        sessionId, loginAt: new Date(), ipAddress, userAgent, isActive: true
      });
    } catch (_) {}

    // Write LOGIN activity log
    try {
      await logActivity({
        userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
        eventType: 'LOGIN',
        details: { route: '/api/auth/login', method: 'POST', sessionId, ipAddress, userAgent, note: 'Login successful' }
      });
    } catch (_) {}

    // Update trigger summary for login stats
    try {
      await UserTriggerSummary.findOneAndUpdate(
        { userId: user._id },
        { $set: { userName: user.name, userRole: user.role, lastLoginAt: new Date(), lastActiveAt: new Date() }, $inc: { totalLogins: 1 } },
        { upsert: true }
      );
    } catch (_) {}

    // Legacy activity log (keep existing)
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'USER_LOGIN',
      userId: user._id,
      note: `Logged in: ${user.name} (${user.email}) - Role: ${user.role}`
    });

    res.json({ token, user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Logout ─────────────────────────────────────────────
// @desc  Logout user — close session, write log
// @route POST /api/auth/logout
// @access Private
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { sessionId, id: userId } = decoded;

        if (sessionId) {
          const session = await UserSession.findOne({ sessionId, isActive: true });
          if (session) {
            const logoutAt = new Date();
            const duration = logoutAt - session.loginAt;
            session.logoutAt  = logoutAt;
            session.duration  = duration;
            session.isActive  = false;
            session.logoutType = 'manual';
            await session.save();

            const user = req.user || { _id: userId, name: session.userName, email: session.userEmail, role: session.userRole };
            await logActivity({
              userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
              eventType: 'LOGOUT',
              details: { sessionId, note: `Session duration: ${Math.round(duration / 1000)}s` }
            });

            await UserTriggerSummary.findOneAndUpdate(
              { userId: user._id },
              { $set: { lastLogoutAt: logoutAt, lastActiveAt: logoutAt }, $inc: { totalLogouts: 1 } },
              { upsert: true }
            );
          }
        }
      } catch (_) {}
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get Profile ───────────────────────────────────────────
// @desc  Get logged-in user's own profile
// @route GET /api/auth/profile
// @access Private
const getProfile = async (req, res) => {
  try {
    res.json(userResponse(req.user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update Profile ────────────────────────────────────────
// @desc  Update own profile (name, department only — NOT role/email/status)
// @route PUT /api/auth/profile
// @access Private (own account only — enforced here, not middleware)
const updateProfile = async (req, res) => {
  try {
    const targetId = req.params.id || req.user._id;
    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Only allow updating personal fields
    let { name, email, password } = req.body;
    name = sanitizeText(name);
    if (email) email = email.toLowerCase().trim();

    if (name) {
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({ message: 'Name must be 2–50 characters' });
      }
      user.name = name;
    }
    
    if (email && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ message: 'Invalid email format' });
      
      const emailExists = await User.findOne({ email });
      if (emailExists) return res.status(400).json({ message: 'Email already in use' });
      user.email = email;
    }

    if (password) {
      const pwError = validatePassword(password);
      if (pwError) return res.status(400).json({ message: pwError });
      user.password = password;
    }

    // Handle avatar uploaded via multer (if present in this request)
    if (req.file) {
      const avatarUrl = `/uploads/${req.file.filename}`;
      user.avatar = avatarUrl;
    }

    const updated = await user.save();
    res.json(userResponse(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, logout, getProfile, updateProfile };
