const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const User = require('../../models/User');
const ActivityLog = require('../../models/ActivityLog');
const RoleFeature = require('../../models/RoleFeature');
const ROLE_DEFAULTS = require('../../config/roleDefaults');
const { protect } = require('../../middleware/authMiddleware');
const { requireSuperAdmin, requireFeature } = require('../../middleware/roleMiddleware');
const { createAdminValidator } = require('../../middleware/validationMiddleware');

router.post('/create-user', ...guardRoute('create_user'), createAdminValidator, async (req, res) => {
  try {
    let { name, email, password, role = 'user' } = req.body;
    name  = name.trim().replace(/[<>{}\$%\^*]/g, '');
    email = (email || '').toLowerCase().trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      password,
      role,
      isApproved: true,
      isActive: true,
    });

    await ActivityLog.create({
      action: 'USER_CREATED',
      userId: user._id,
      adminId: req.user._id,
      note: `User account created with role ${role} for: ${user.name} (${user.email}) by super admin: ${req.user.name}`
    });

    const defaults = ROLE_DEFAULTS[role] || ['dashboard'];
    await RoleFeature.create({ userId: user._id, role, features: defaults });

    res.status(201).json({
      message: 'User account created successfully',
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
