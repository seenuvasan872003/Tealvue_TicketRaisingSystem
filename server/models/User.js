// ============================================================
//  server/models/User.js  —  User Schema
// ============================================================
//  ROLES:
//    user        — create/manage own tickets
//    admin       — manage assigned tickets, see user accounts
//    super-admin — full system access, manage all accounts
//
//  NEW FIELDS (Phase 1 upgrade):
//    role:       added 'super-admin' to enum
//    isApproved: false = awaiting Super Admin approval (for admins)
//    isActive:   false = suspended by Super Admin
//    avatar:     URL/path to uploaded profile picture
//    department: optional text for filtering/grouping
// ============================================================

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: 8,
      select:    false, // never return password in queries
    },
    role: {
      type:    String,
      enum:    ['user', 'admin', 'super-admin', 'team_admin', 'team_user'],
      default: 'user',
    },

    // ── Approval & Active state ───────────────────────────
    // isApproved: public users default true; admin accounts need Super Admin approval
    isApproved: {
      type:    Boolean,
      default: true,
    },
    // isActive: Super Admin can suspend any account
    isActive: {
      type:    Boolean,
      default: true,
    },

    // ── Profile ───────────────────────────────────────────
    avatar: {
      type:    String,
      default: null,
    },
    department: {
      type:    String,
      trim:    true,
      default: null,
    },
    // ── Security block fields ─────────────────────────────
    securityFlags: {
      type:    Number,
      default: 0,
    },
    securityBlockUntil: {
      type:    Date,
      default: null,
    },

    // ── Reopen Flag ───────────────────────────────────────
    reopenFlagCount: { type: Number, default: 0 },

    // ── Email Verification ────────────────────────────────
    isEmailVerified: {
      type:    Boolean,
      default: false,
    },
    verifiedAt: {
      type:    Date,
      default: null,
    },
    otpEnabled: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ── Hash password before save ──────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt    = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare password helper ────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
