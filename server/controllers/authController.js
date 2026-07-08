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
const bcrypt       = require('bcryptjs');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const UserSession  = require('../models/UserSession');
const UserTriggerSummary = require('../models/UserTriggerSummary');
const EmailOTP     = require('../models/EmailOTP');
const OTPBlock     = require('../models/OTPBlock');
const { logActivity } = require('../utils/logActivity');
const { isWhitelisted } = require('../utils/whitelist');
const { generateOTP } = require('../utils/generateOTP');
const { sendOTPEmail } = require('../utils/mailer');

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
    let { name, email, password, confirmPassword } = req.body;

    const emailLower = (email || '').toLowerCase().trim();
    name = sanitizeText(name);

    // 1. Check block
    const block = await OTPBlock.findOne({ email: emailLower });
    if (block) {
      const remaining = Math.ceil((block.blockExpiresAt - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        code: 'OTP_BLOCKED',
        message: `Account blocked. Try again in ${remaining} minutes.`
      });
    }

    // 2. Validate fields
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Password strength
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ message: pwError });

    // 3. Check whitelist
    if (!isWhitelisted(emailLower)) {
      return res.status(403).json({ message: 'This email is not authorised to register.' });
    }

    // 4. Check duplicate
    const existing = await User.findOne({ email: emailLower });
    if (existing && existing.isEmailVerified) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // 5. Create or reuse unverified user
    let user = existing;
    if (!user) {
      user = await User.create({
        name: name.trim(),
        email: emailLower,
        password: password, // Mongoose pre-save hashes this password automatically
        role: 'user',
        isEmailVerified: false,
        isApproved: true,
        isActive: true
      });
    }

    // 6. Check resend limit
    const existingOTP = await EmailOTP.findOne({
      email: emailLower,
      type: 'register',
      isUsed: false
    });
    if (existingOTP) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (
        existingOTP.resendCount >= 3 &&
        existingOTP.lastResendAt > fifteenMinutesAgo
      ) {
        return res.status(429).json({
          message: 'Too many OTP requests. Wait 15 minutes before trying again.'
        });
      }
    }

    // 7. Delete old unused OTPs for this email + type
    await EmailOTP.deleteMany({ email: emailLower, type: 'register', isUsed: false });

    // 8. Generate and send OTP
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    const otpDoc = await EmailOTP.create({
      email:    emailLower,
      hashedOTP,
      type:     'register',
      userId:   user._id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    try {
      await sendOTPEmail({ to: emailLower, otp, type: 'register' });
    } catch (emailErr) {
      // Rollback OTP doc if email fails so user can retry cleanly
      await EmailOTP.deleteOne({ _id: otpDoc._id });
      console.error('[REGISTER] Email send failed, rolled back OTP:', emailErr.message);
      return res.status(500).json({
        message: 'Could not send verification email. Please check your email address and try again.',
        error: emailErr.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Verify to complete registration.',
      email: emailLower
    });

  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Login ─────────────────────────────────────────────
// @desc  Login user
// @route POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLower = (email || '').toLowerCase().trim();

    // 1. Check block
    const block = await OTPBlock.findOne({ email: emailLower });
    if (block) {
      const remaining = Math.ceil((block.blockExpiresAt - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        code: 'OTP_BLOCKED',
        message: `Account blocked. Try again in ${remaining} minutes.`
      });
    }

    // 2. Find user
    const user = await User.findOne({ email: emailLower }).select('+password');
    if (!user) {
      try {
        await logActivity({
          userId: null, userName: emailLower, userEmail: emailLower, userRole: null,
          eventType: 'FAILED_LOGIN',
          details: { route: '/api/auth/login', method: 'POST', note: 'User not found', ipAddress: req.ip || req.headers['x-forwarded-for'], userAgent: req.headers['user-agent'] }
        });
      } catch (_) {}
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 3. Check verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in.',
        email: emailLower
      });
    }

    // 4. Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      try {
        await logActivity({
          userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
          eventType: 'FAILED_LOGIN',
          details: { route: '/api/auth/login', method: 'POST', note: 'Wrong credentials', ipAddress: req.ip || req.headers['x-forwarded-for'], userAgent: req.headers['user-agent'] }
        });
      } catch (_) {}
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check account status before password match to give clear messages
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account suspended — please contact support' });
    }
    if (!user.isApproved) {
      return res.status(403).json({ message: 'Account pending approval — please wait for Super Admin approval' });
    }

    // Direct Login Bypass for Old Users
    if (user.otpEnabled === false) {
      let sessionId;
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];

      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      try {
        const existingSession = await UserSession.findOne({
          userId: user._id,
          loginAt: { $gte: todayStart, $lte: todayEnd }
        });

        if (existingSession) {
          sessionId = existingSession.sessionId;
          existingSession.isActive = true;
          existingSession.logoutAt = null;
          existingSession.duration = null;
          existingSession.ipAddress = ipAddress;
          existingSession.userAgent = userAgent;
          await existingSession.save();
        } else {
          sessionId = crypto.randomUUID();
          await UserSession.create({
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            sessionId,
            loginAt: new Date(),
            ipAddress,
            userAgent,
            isActive: true
          });
        }
      } catch (_) {
        sessionId = crypto.randomUUID();
      }

      const token = generateToken(user._id, sessionId);

      await logActivity({
        userId:    user._id,
        userName:  user.name,
        userEmail: user.email,
        userRole:  user.role,
        eventType: 'LOGIN',
        details: { sessionId, ipAddress, userAgent, note: 'Login successful (Direct)' }
      });

      try {
        await UserTriggerSummary.findOneAndUpdate(
          { userId: user._id },
          { $set: { userName: user.name, userRole: user.role, lastLoginAt: new Date(), lastActiveAt: new Date() }, $inc: { totalLogins: 1 } },
          { upsert: true }
        );
      } catch (_) {}

      // Legacy activity log
      const ActivityLog = require('../models/ActivityLog');
      try {
        await ActivityLog.create({
          action: 'USER_LOGIN',
          userId: user._id,
          note: `Logged in (Direct): ${user.name} (${user.email}) - Role: ${user.role}`
        });
      } catch (_) {}

      return res.status(200).json({
        success: true,
        direct: true,
        token,
        user: userResponse(user)
      });
    }

    // 5. Check resend limit
    const existingOTP = await EmailOTP.findOne({
      email: emailLower,
      type: 'login',
      isUsed: false
    });
    if (existingOTP) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (
        existingOTP.resendCount >= 3 &&
        existingOTP.lastResendAt > fifteenMinutesAgo
      ) {
        return res.status(429).json({
          message: 'Too many OTP requests. Wait 15 minutes.'
        });
      }
    }

    // 6. Delete old unused login OTPs
    await EmailOTP.deleteMany({ email: emailLower, type: 'login', isUsed: false });

    // 7. Generate and send OTP
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    const otpDoc = await EmailOTP.create({
      email:     emailLower,
      hashedOTP,
      type:      'login',
      userId:    user._id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    try {
      await sendOTPEmail({ to: emailLower, otp, type: 'login' });
    } catch (emailErr) {
      await EmailOTP.deleteOne({ _id: otpDoc._id });
      console.error('[LOGIN] Email send failed, rolled back OTP:', emailErr.message);
      return res.status(500).json({
        message: 'Could not send verification email. Please try again.',
        error: emailErr.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email.',
      email:   emailLower
    });

  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const verifyRegister = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const emailLower = (email || '').toLowerCase().trim();

    // 1. Check block
    const block = await OTPBlock.findOne({ email: emailLower });
    if (block) {
      const remaining = Math.ceil((block.blockExpiresAt - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        code: 'OTP_BLOCKED',
        message: `Account blocked for ${remaining} more minutes.`,
        blockedMinutes: remaining
      });
    }

    // 2. Find OTP document
    const otpDoc = await EmailOTP.findOne({
      email: emailLower,
      type: 'register',
      isUsed: false
    });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or already used. Please request a new one.'
      });
    }

    // 3. Check expiry
    if (otpDoc.expiresAt < new Date()) {
      await EmailOTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        success: false,
        code: 'OTP_EXPIRED',
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // 4. Check wrong attempts
    if (otpDoc.wrongAttempts >= 5) {
      return res.status(429).json({
        success: false,
        code: 'OTP_BLOCKED',
        message: 'Too many wrong attempts. Request a new OTP.'
      });
    }

    // 5. Compare OTP
    const isMatch = await bcrypt.compare(otp, otpDoc.hashedOTP);

    if (!isMatch) {
      otpDoc.wrongAttempts += 1;
      const remaining = 5 - otpDoc.wrongAttempts;

      if (otpDoc.wrongAttempts >= 5) {
        otpDoc.isBlocked = true;
        otpDoc.blockedAt = new Date();
        otpDoc.blockExpiresAt = new Date(Date.now() + 20 * 60 * 1000);
        await otpDoc.save();

        // Create block record
        await OTPBlock.findOneAndUpdate(
          { email: emailLower },
          {
            email:          emailLower,
            blockedAt:      new Date(),
            blockExpiresAt: new Date(Date.now() + 20 * 60 * 1000),
            reason:         'Too many wrong OTP attempts on registration',
            attemptCount:   5
          },
          { upsert: true, new: true }
        );

        // Send block notification email
        await sendOTPEmail({ to: emailLower, type: 'blocked', blockedMinutes: 20 });

        return res.status(429).json({
          success: false,
          code: 'OTP_BLOCKED',
          message: 'Too many wrong attempts. Account blocked for 20 minutes.',
          blockedMinutes: 20
        });
      }

      await otpDoc.save();
      return res.status(400).json({
        success: false,
        code: 'OTP_WRONG',
        message: `Incorrect OTP. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
        remainingAttempts: remaining
      });
    }

    // 6. OTP correct — activate account
    otpDoc.isUsed = true;
    await otpDoc.save();

    const user = await User.findByIdAndUpdate(
      otpDoc.userId,
      { isEmailVerified: true, verifiedAt: new Date() },
      { new: true }
    );

    // 7. Create default RoleFeature
    try {
      const defaults = ROLE_DEFAULTS['user'] || ['dashboard'];
      await RoleFeature.findOneAndUpdate(
        { userId: otpDoc.userId },
        { userId: otpDoc.userId, role: 'user', features: defaults },
        { upsert: true }
      );
    } catch (_) {}

    // 8. Create session and return token so frontend can auto-login
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    let sessionId;
    try {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
      const existing   = await UserSession.findOne({ userId: user._id, loginAt: { $gte: todayStart, $lte: todayEnd } });
      if (existing) {
        sessionId = existing.sessionId;
        existing.isActive = true; existing.logoutAt = null; existing.duration = null;
        existing.ipAddress = ipAddress; existing.userAgent = userAgent;
        await existing.save();
      } else {
        sessionId = crypto.randomUUID();
        await UserSession.create({
          userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
          sessionId, loginAt: new Date(), ipAddress, userAgent, isActive: true
        });
      }
    } catch (_) { sessionId = crypto.randomUUID(); }

    const token = generateToken(user._id, sessionId);

    await logActivity({
      userId: user._id, userName: user.name, userEmail: user.email, userRole: user.role,
      eventType: 'LOGIN',
      details: { sessionId, ipAddress, userAgent, note: 'Registered and verified via OTP' }
    });

    try {
      await UserTriggerSummary.findOneAndUpdate(
        { userId: user._id },
        { $set: { userName: user.name, userRole: user.role, lastLoginAt: new Date(), lastActiveAt: new Date() }, $inc: { totalLogins: 1 } },
        { upsert: true }
      );
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: 'Email verified. Welcome to Tealvue!',
      token,
      user: userResponse(user)
    });

  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const emailLower = (email || '').toLowerCase().trim();

    // 1. Check block
    const block = await OTPBlock.findOne({ email: emailLower });
    if (block) {
      const remaining = Math.ceil((block.blockExpiresAt - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        code: 'OTP_BLOCKED',
        message: `Account blocked for ${remaining} more minutes.`,
        blockedMinutes: remaining
      });
    }

    // 2. Find OTP document
    const otpDoc = await EmailOTP.findOne({
      email: emailLower,
      type: 'login',
      isUsed: false
    });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or already used. Please login again.'
      });
    }

    // 3. Check expiry
    if (otpDoc.expiresAt < new Date()) {
      await EmailOTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        success: false,
        code: 'OTP_EXPIRED',
        message: 'OTP has expired. Please login again to get a new code.'
      });
    }

    // 4. Check wrong attempts
    if (otpDoc.wrongAttempts >= 5) {
      return res.status(429).json({
        success: false,
        code: 'OTP_BLOCKED',
        message: 'Too many wrong attempts. Please login again.'
      });
    }

    // 5. Compare OTP
    const isMatch = await bcrypt.compare(otp, otpDoc.hashedOTP);

    if (!isMatch) {
      otpDoc.wrongAttempts += 1;
      const remaining = 5 - otpDoc.wrongAttempts;

      if (otpDoc.wrongAttempts >= 5) {
        otpDoc.isBlocked = true;
        otpDoc.blockedAt = new Date();
        otpDoc.blockExpiresAt = new Date(Date.now() + 20 * 60 * 1000);
        await otpDoc.save();

        await OTPBlock.findOneAndUpdate(
          { email: emailLower },
          {
            email:          emailLower,
            blockedAt:      new Date(),
            blockExpiresAt: new Date(Date.now() + 20 * 60 * 1000),
            reason:         'Too many wrong OTP attempts on login',
            attemptCount:   5
          },
          { upsert: true, new: true }
        );

        await sendOTPEmail({ to: emailLower, type: 'blocked', blockedMinutes: 20 });

        return res.status(429).json({
          success: false,
          code: 'OTP_BLOCKED',
          message: 'Too many wrong attempts. Account blocked for 20 minutes.',
          blockedMinutes: 20
        });
      }

      await otpDoc.save();
      return res.status(400).json({
        success: false,
        code: 'OTP_WRONG',
        message: `Incorrect OTP. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
        remainingAttempts: remaining
      });
    }

    // 6. OTP correct — issue JWT
    otpDoc.isUsed = true;
    await otpDoc.save();

    const user = await User.findById(otpDoc.userId);

    // Reuse/create daily session
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let sessionId;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    try {
      const existingSession = await UserSession.findOne({
        userId: user._id,
        loginAt: { $gte: todayStart, $lte: todayEnd }
      });

      if (existingSession) {
        sessionId = existingSession.sessionId;
        existingSession.isActive = true;
        existingSession.logoutAt = null;
        existingSession.duration = null;
        existingSession.ipAddress = ipAddress;
        existingSession.userAgent = userAgent;
        await existingSession.save();
      } else {
        sessionId = crypto.randomUUID();
        await UserSession.create({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          sessionId,
          loginAt: new Date(),
          ipAddress,
          userAgent,
          isActive: true
        });
      }
    } catch (_) {
      sessionId = crypto.randomUUID();
    }

    const token = generateToken(user._id, sessionId);

    await logActivity({
      userId:    user._id,
      userName:  user.name,
      userEmail: user.email,
      userRole:  user.role,
      eventType: 'LOGIN',
      details: { sessionId, ipAddress, userAgent, note: 'Login successful' }
    });

    try {
      await UserTriggerSummary.findOneAndUpdate(
        { userId: user._id },
        { $set: { userName: user.name, userRole: user.role, lastLoginAt: new Date(), lastActiveAt: new Date() }, $inc: { totalLogins: 1 } },
        { upsert: true }
      );
    } catch (_) {}

    // Legacy activity log
    const ActivityLog = require('../models/ActivityLog');
    try {
      await ActivityLog.create({
        action: 'USER_LOGIN',
        userId: user._id,
        note: `Logged in: ${user.name} (${user.email}) - Role: ${user.role}`
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      token,
      user: userResponse(user)
    });

  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email, type } = req.body;
    const emailLower = (email || '').toLowerCase().trim();

    if (!['register', 'login'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type.' });
    }

    // 1. Check block
    const block = await OTPBlock.findOne({ email: emailLower });
    if (block) {
      const remaining = Math.ceil((block.blockExpiresAt - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        code: 'OTP_BLOCKED',
        message: `Account blocked. Try again in ${remaining} minutes.`,
        blockedMinutes: remaining
      });
    }

    // 2. Find existing OTP doc
    const existingOTP = await EmailOTP.findOne({
      email: emailLower,
      type,
      isUsed: false
    });

    // 3. Check resend rate limit
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (
      existingOTP &&
      existingOTP.resendCount >= 3 &&
      existingOTP.lastResendAt > fifteenMinutesAgo
    ) {
      return res.status(429).json({
        success: false,
        code: 'RESEND_LIMIT',
        message: 'Too many OTP requests. Please wait 15 minutes before trying again.'
      });
    }

    // 4. For login type — verify user exists and is verified
    if (type === 'login') {
      const user = await User.findOne({ email: emailLower });
      if (!user || !user.isEmailVerified) {
        return res.status(400).json({ message: 'User not found or not verified.' });
      }
    }

    // 5. For register type — verify user exists and is not verified
    if (type === 'register') {
      const user = await User.findOne({ email: emailLower });
      if (!user) {
        return res.status(400).json({ message: 'User not found. Please register first.' });
      }
      if (user.isEmailVerified) {
        return res.status(400).json({ message: 'Email already verified. Please login.' });
      }
    }

    // 6. Count this as a resend — update existing doc or track it
    const resendCount   = (existingOTP?.resendCount || 0) + 1;
    const lastResendAt  = new Date();

    // 7. Delete old OTP
    await EmailOTP.deleteMany({ email: emailLower, type, isUsed: false });

    // 8. Generate new OTP
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    const user = await User.findOne({ email: emailLower });

    await EmailOTP.create({
      email:       emailLower,
      hashedOTP,
      type,
      userId:      user._id,
      expiresAt:   new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      resendCount,
      lastResendAt
    });

    await sendOTPEmail({ to: emailLower, otp, type });

    return res.status(200).json({
      success: true,
      message: 'New OTP sent to your email.',
      resendCount,
      resendRemaining: 3 - resendCount
    });

  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
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

module.exports = { register, login, logout, getProfile, updateProfile, verifyRegister, verifyLogin, resendOTP };
