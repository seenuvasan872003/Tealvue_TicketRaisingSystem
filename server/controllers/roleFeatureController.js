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
      .select('_id name email role avatar securityFlags securityBlockUntil')
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
        securityFlags: user.securityFlags || 0,
        securityBlockUntil: user.securityBlockUntil || null,
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

// ── Unblock User account (super-admin) ───────────────────
const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.securityFlags = 0;
    user.securityBlockUntil = null;
    await user.save();

    await ActivityLog.create({
      action:  'FEATURE_UPDATED',
      userId:  user._id,
      adminId: req.user._id,
      note:    `Security block cleared and flags reset to 0 for ${user.name} by ${req.user.name}`,
    });

    res.json({ message: 'User security flags cleared and account unblocked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Log frontend route violation ─────────────────────────────
const logViolation = async (req, res) => {
  try {
    const { featureId, route } = req.body;
    
    if (req.user && req.user.role === 'super-admin') {
      return res.json({ flags: 0, isBlocked: false });
    }

    const User = require('../models/User');
    const ClientLog = require('../models/ClientLog');
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    let isBlocked = false;
    let blockUntilDate = null;
    let newFlagsCount = 0;
    
    user.securityFlags = (user.securityFlags || 0) + 1;
    newFlagsCount = user.securityFlags;
    if (user.securityFlags >= 5) {
      isBlocked = true;
      blockUntilDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      user.securityBlockUntil = blockUntilDate;
    }
    await user.save();
    
    const message = `Unauthorized Frontend Route Access Attempt on feature: '${featureId}'. User flags count: ${newFlagsCount}/5.${isBlocked ? ' USER BLOCKED FOR 24 HOURS.' : ''}`;
    
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
      file: 'client/src/App.jsx',
      component: 'Frontend RoleGuard',
      function: 'logViolation',
      api: 'Frontend Route',
      method: 'GET',
      status: '403',
      message: message,
      route: route || 'unknown',
      action: 'FRONTEND_FEATURE_VIOLATION',
      userId: req.user._id,
    });
    
    res.json({ flags: newFlagsCount, isBlocked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get bulk preview count ───────────────────────────────────
const getPreviewCount = async (req, res) => {
  try {
    const { featureIds, roles } = req.query;
    if (!featureIds || !roles) {
      return res.status(400).json({ message: 'featureIds and roles are required' });
    }
    const fArray = featureIds.split(',');
    const rolesArray = roles.split(',');

    const users = await User.find({ role: { $in: rolesArray }, isActive: true }).select('_id');
    const userIds = users.map(u => u._id);

    // Count users who don't have ALL of the selected features (meaning they will get at least one new)
    const count = await RoleFeature.countDocuments({
      userId: { $in: userIds },
      features: { $not: { $all: fArray } }
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Bulk assign feature to roles ─────────────────────────────
const assignFeatureToRoles = async (req, res) => {
  try {
    const { featureIds, roles } = req.body;
    if (!Array.isArray(featureIds) || featureIds.length === 0 || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ message: 'featureIds array and roles array are required' });
    }

    const FEATURES = require('../config/featureList');
    const allExist = featureIds.every(fid => FEATURES.some(f => f.id === fid));
    if (!allExist) {
      return res.status(400).json({ message: `One or more features not found in FEATURES config` });
    }

    const users = await User.find({ role: { $in: roles } }).select('_id role');
    const userIds = users.map(u => u._id);

    // Ensure RoleFeature docs exist for all users
    await Promise.all(users.map(async (u) => {
      const exists = await RoleFeature.findOne({ userId: u._id });
      if (!exists) {
        const defaults = ROLE_DEFAULTS[u.role] || ['dashboard'];
        await RoleFeature.create({
          userId: u._id,
          role: u.role,
          features: defaults
        });
      }
    }));

    await RoleFeature.updateMany(
      { userId: { $in: userIds } },
      { $addToSet: { features: { $each: featureIds } } }
    );

    // Log to ActivityLog
    await ActivityLog.create({
      action: 'FEATURE_ASSIGNED_TO_ROLES',
      adminId: req.user._id,
      note: `Features [${featureIds.join(', ')}] assigned to roles: ${roles.join(', ')} — ${userIds.length} users updated`,
    });

    res.json({ success: true, message: `Features added to ${userIds.length} users`, count: userIds.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Bulk remove feature from roles ───────────────────────────
const removeFeatureFromRoles = async (req, res) => {
  try {
    const { featureIds, roles } = req.body;
    if (!Array.isArray(featureIds) || featureIds.length === 0 || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ message: 'featureIds array and roles array are required' });
    }

    const FEATURES = require('../config/featureList');
    const allExist = featureIds.every(fid => FEATURES.some(f => f.id === fid));
    if (!allExist) {
      return res.status(400).json({ message: `One or more features not found in FEATURES config` });
    }

    const users = await User.find({ role: { $in: roles } }).select('_id');
    const userIds = users.map(u => u._id);

    let warning = null;
    let updateIds = userIds;
    if (featureIds.includes('roles_features') && roles.includes('super-admin')) {
      updateIds = userIds.filter(uid => uid.toString() !== req.user._id.toString());
      warning = "The 'roles_features' feature was not removed from your own account for safety.";
    }

    await RoleFeature.updateMany(
      { userId: { $in: updateIds } },
      { $pullAll: { features: featureIds } }
    );

    // Log to ActivityLog
    await ActivityLog.create({
      action: 'FEATURE_REMOVED_FROM_ROLES',
      adminId: req.user._id,
      note: `Features [${featureIds.join(', ')}] removed from roles: ${roles.join(', ')}`,
    });

    res.json({ success: true, message: `Features removed from ${updateIds.length} users`, warning });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Reset all users of a role to defaults ────────────────────
const resetRoleFeatures = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['super-admin', 'admin', 'user', 'team_admin', 'team_user'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Valid role is required' });
    }

    const defaultFeatures = ROLE_DEFAULTS[role] || ['dashboard'];
    const users = await User.find({ role }).select('_id');
    const userIds = users.map(u => u._id);

    await Promise.all(users.map(async (u) => {
      const exists = await RoleFeature.findOne({ userId: u._id });
      if (!exists) {
        await RoleFeature.create({
          userId: u._id,
          role: u.role,
          features: defaultFeatures
        });
      }
    }));

    await RoleFeature.updateMany(
      { userId: { $in: userIds } },
      { $set: { features: defaultFeatures } }
    );

    // Log to ActivityLog
    await ActivityLog.create({
      action: 'ROLE_FEATURES_RESET',
      adminId: req.user._id,
      note: `Features reset to default configuration for role: ${role}`,
    });

    res.json({ success: true, message: `Role ${role} features reset to defaults for ${userIds.length} users` });
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
  unblockUser,
  logViolation,
  getPreviewCount,
  assignFeatureToRoles,
  removeFeatureFromRoles,
  resetRoleFeatures,
};
