// ============================================================
//  server/controllers/roleFeatureController.js
// ============================================================
//  GET  /api/role-features/me          → current user's features (all roles)
//  GET  /api/role-features             → all users features (super-admin)
//  GET  /api/role-features/:userId     → single user features (super-admin)
//  PUT  /api/role-features/:userId     → update single user features (super-admin)
//  PUT  /api/role-features/role/:role  → bulk update all users of a role (super-admin)
// ============================================================

const RoleFeature   = require('../models/RoleFeature');
const User          = require('../models/User');
const ActivityLog   = require('../models/ActivityLog');
const ROLE_DEFAULTS = require('../config/roleDefaults');

// ── Get my features (all authenticated users) ─────────────
const getMyFeatures = async (req, res) => {
  try {
    let doc = await RoleFeature.findOne({ userId: req.user._id });
    if (!doc) {
      // Auto-create with role defaults if missing
      const defaults = ROLE_DEFAULTS[req.user.role] || ['dashboard'];
      doc = await RoleFeature.create({
        userId:   req.user._id,
        role:     req.user.role,
        features: defaults,
      });
    }
    res.json({ features: doc.features, role: doc.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get all users with their feature lists (super-admin) ──
const getAllUserFeatures = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('_id name email role avatar')
      .sort({ role: 1, name: 1 });

    const featureDocs = await RoleFeature.find({
      userId: { $in: users.map(u => u._id) }
    });

    const featureMap = {};
    featureDocs.forEach(doc => { featureMap[doc.userId.toString()] = doc; });

    const result = users.map(user => {
      const doc = featureMap[user._id.toString()];
      const features = doc ? doc.features : (ROLE_DEFAULTS[user.role] || ['dashboard']);
      return {
        userId:      user._id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        avatar:      user.avatar,
        features,
        lastUpdated: doc?.updatedAt || null,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get single user's features (super-admin) ──────────────
const getUserFeatures = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('_id name email role');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let doc = await RoleFeature.findOne({ userId: user._id });
    if (!doc) {
      const defaults = ROLE_DEFAULTS[user.role] || ['dashboard'];
      doc = await RoleFeature.create({
        userId:   user._id,
        role:     user.role,
        features: defaults,
      });
    }
    res.json({ userId: user._id, name: user.name, email: user.email, role: user.role, features: doc.features });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update single user's features (super-admin) ───────────
const updateUserFeatures = async (req, res) => {
  try {
    const { features } = req.body;
    if (!Array.isArray(features)) {
      return res.status(400).json({ message: 'features must be an array' });
    }

    const targetUser = await User.findById(req.params.userId).select('_id name email role');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Guard: super-admin cannot remove roles_features from themselves
    if (
      req.params.userId === req.user._id.toString() &&
      req.user.role === 'super-admin' &&
      !features.includes('roles_features')
    ) {
      return res.status(400).json({
        message: 'You cannot remove access to the Roles & Features page from your own account.'
      });
    }

    const doc = await RoleFeature.findOneAndUpdate(
      { userId: targetUser._id },
      { $set: { features, updatedBy: req.user._id, role: targetUser.role } },
      { upsert: true, new: true }
    );

    await ActivityLog.create({
      action:  'FEATURE_UPDATED',
      userId:  targetUser._id,
      adminId: req.user._id,
      note:    `Features updated for ${targetUser.name} (${targetUser.role}) by ${req.user.name}`,
    });

    res.json({ features: doc.features });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Bulk update all users of a role (super-admin) ─────────
const updateRoleFeatures = async (req, res) => {
  try {
    const { role } = req.params;
    const { features } = req.body;

    if (!Array.isArray(features)) {
      return res.status(400).json({ message: 'features must be an array' });
    }

    const validRoles = ['super-admin', 'admin', 'user', 'team_admin', 'team_user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const users = await User.find({ role }).select('_id');
    const userIds = users.map(u => u._id);

    // Bulk upsert for all users of this role
    await Promise.all(userIds.map(uid =>
      RoleFeature.findOneAndUpdate(
        { userId: uid },
        { $set: { features, role, updatedBy: req.user._id } },
        { upsert: true }
      )
    ));

    await ActivityLog.create({
      action:  'FEATURE_UPDATED',
      adminId: req.user._id,
      note:    `Bulk feature update applied to all ${role} users (${userIds.length} users) by ${req.user.name}`,
    });

    res.json({ updated: userIds.length, role, features });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMyFeatures,
  getAllUserFeatures,
  getUserFeatures,
  updateUserFeatures,
  updateRoleFeatures,
};
