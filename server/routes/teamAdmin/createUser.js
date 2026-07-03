const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const User = require('../../models/User');
const Team = require('../../models/Team');
const ActivityLog = require('../../models/ActivityLog');
const RoleFeature = require('../../models/RoleFeature');
const ROLE_DEFAULTS = require('../../config/roleDefaults');
const { protect } = require('../../middleware/authMiddleware');
const { requireFeature } = require('../../middleware/roleMiddleware');
const { createAdminValidator } = require('../../middleware/validationMiddleware');

// Custom check to enforce team_admin role
const requireTeamAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'team_admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied — Team Admins only' });
};

router.post('/create-user', protect, requireTeamAdmin, requireFeature('create_user'), createAdminValidator, async (req, res) => {
  try {
    let { name, email, password } = req.body;
    name  = name.trim().replace(/[<>{}\$%\^*]/g, '');
    email = (email || '').toLowerCase().trim();

    const team = await Team.findOne({ teamAdmin: req.user._id });
    if (!team) {
      return res.status(400).json({ message: 'You do not manage any team, cannot create team user' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    // Force role to team_user
    const role = 'team_user';

    const user = await User.create({
      name,
      email,
      password,
      role,
      isApproved: true,
      isActive: true,
    });

    // Automatically add to team
    team.members.push(user._id);
    await team.save();

    await ActivityLog.create({
      action: 'USER_CREATED',
      userId: user._id,
      adminId: req.user._id,
      note: `Team Agent account created for team "${team.name}" by team admin: ${req.user.name}`
    });

    const defaults = ROLE_DEFAULTS[role] || ['dashboard'];
    await RoleFeature.create({ userId: user._id, role, features: defaults });

    res.status(201).json({
      message: 'Team Agent account created and assigned to team successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isActive: user.isActive,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
