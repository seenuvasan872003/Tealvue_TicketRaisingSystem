// ============================================================
//  server/routes/superAdmin/roleManagement.js
//  Super Admin — view all users and change their roles
// ============================================================

const express        = require('express');
const router         = express.Router();
const { guardRoute } = require('../../middleware/guardRoute');
const User           = require('../../models/User');
const RoleFeature    = require('../../models/RoleFeature');
const ActivityLog    = require('../../models/ActivityLog');

const VALID_ROLES = ['user', 'admin', 'team_admin', 'team_user'];

// Role defaults (mirrors client/src/config/roleDefaults.js)
const ROLE_DEFAULTS = {
  'super-admin': [
    'dashboard', 'ticket_approval', 'all_users',
    'teams_management', 'features_management', 'role_management',
    'team_dashboard', 'manage_categories', 'ticket_lifecycle_logs',
    'activity_logs', 'client_logs'
  ],
  admin:      ['dashboard', 'all_tickets', 'all_users', 'team_dashboard', 'ticket_lifecycle_logs', 'activity_logs'],
  user:       ['dashboard', 'my_tickets', 'create_ticket', 'ticket_states'],
  team_admin: ['dashboard', 'team_tickets', 'team_members', 'team_performance'],
  team_user:  ['dashboard', 'assigned_tickets', 'finished_tickets'],
};

// ── GET /role-management — list all users ────────────────────
router.get('/role-management', ...guardRoute('role_management'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role)   filter.role = role;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('name email role avatar isActive isApproved createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /role-management/counts — users per role ─────────────
router.get('/role-management/counts', ...guardRoute('role_management'), async (req, res) => {
  try {
    const counts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const result = { total: 0 };
    counts.forEach(c => {
      result[c._id] = c.count;
      result.total += c.count;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /role-management/:userId — change a user's role ──────
router.put('/role-management/:userId', ...guardRoute('role_management'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole } = req.body;

    // Validation: cannot assign super-admin
    if (!VALID_ROLES.includes(newRole)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}` });
    }

    // Validation: cannot change own role
    if (userId === req.user._id.toString()) {
      return res.status(403).json({ message: 'You cannot change your own role.' });
    }

    // Fetch target user
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    const previousRole = targetUser.role;

    // Validation: cannot demote the last super-admin
    if (previousRole === 'super-admin') {
      const superAdminCount = await User.countDocuments({ role: 'super-admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          message: 'Cannot change role — this is the only Super Admin account.'
        });
      }
    }

    // Update User.role
    targetUser.role = newRole;
    await targetUser.save();

    // Update or create RoleFeature record — reset features to new role defaults
    const newFeatures = ROLE_DEFAULTS[newRole] || [];
    await RoleFeature.findOneAndUpdate(
      { userId },
      { role: newRole, features: newFeatures },
      { upsert: true, new: true }
    );

    // Log activity
    await ActivityLog.create({
      action:  'ROLE_CHANGED',
      userId:  userId,
      adminId: req.user._id,
      note:    `Role changed from ${previousRole} to ${newRole} for ${targetUser.name} (${targetUser.email})`,
    });

    res.json({
      success: true,
      message: `Role changed to ${newRole} and features reset to defaults.`,
      user: {
        _id:   targetUser._id,
        name:  targetUser.name,
        email: targetUser.email,
        role:  targetUser.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
