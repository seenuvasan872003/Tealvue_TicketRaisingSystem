// ============================================================
//  server/controllers/userController.js  —  User Management
// ============================================================
//  ROUTES USING THIS:
//    GET    /api/users             → getAllUsers()       [Admin+]
//    GET    /api/users/stats       → getUserStats()      [Admin+]
//    GET    /api/users/:id         → getUserById()       [Admin+ or self]
//    POST   /api/users/create-admin→ createAdminAccount()[Super Admin only]
//    PUT    /api/users/:id/status  → updateUserStatus()  [Super Admin only]
//    DELETE /api/users/:id         → deleteUser()        [Admin+, scoped]
// ============================================================

const User         = require('../models/User');
const Notification = require('../models/Notification');

// ── Sanitize helper (reuse pattern) ───────────────────────
const sanitizeText = (str) =>
  typeof str === 'string' ? str.replace(/[<>{}\$%\^*]/g, '').trim() : str;

const validatePassword = (password) => {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password))          return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password))          return 'Password must contain at least one number';
  if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(password))
    return 'Password must contain at least one special character';
  return null;
};

const userResponse = (user) => ({
  _id:        user._id,
  name:       user.name,
  email:      user.email,
  role:       user.role,
  isApproved: user.isApproved,
  isActive:   user.isActive,
  avatar:     user.avatar,
  department: user.department,
  createdAt:  user.createdAt,
});

// ── Get All Users ─────────────────────────────────────────
// @desc  Super Admin: all users; Admin: only 'user' role
// @route GET /api/users
// @access Admin+
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const query = {};

    // Admins can see all users
    if (req.user.role === 'admin' && role) {
      query.role = role;
    } else if (role) {
      query.role = role; // Super Admin can filter by role
    }

    if (status === 'pending')   query.isApproved = false;
    if (status === 'active')    query.isActive   = true;
    if (status === 'suspended') query.isActive   = false;

    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get User Stats ────────────────────────────────────────
// @desc  Dashboard counts: total users/admins/super-admins/pending
// @route GET /api/users/stats
// @access Admin+
const getUserStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, suspendedUsers, pendingApprovals] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, isApproved: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ isApproved: false }),
    ]);

    res.json({ totalUsers, activeUsers, suspendedUsers, pendingApprovals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get User By ID ────────────────────────────────────────
// @desc  Get one user — admin+, or self
// @route GET /api/users/:id
// @access Admin+ or self
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Regular users can only view their own profile through this route
    if (req.user.role === 'user' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(userResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Create Admin Account ──────────────────────────────────
// @desc  Super Admin creates a new admin or super-admin account
// @route POST /api/users/create-admin
// @access Super Admin only
const createAdminAccount = async (req, res) => {
  try {
    let { name, email, password, role, department } = req.body;

    // Sanitize
    name       = sanitizeText(name);
    department = sanitizeText(department);
    email      = (email || '').toLowerCase().trim();
    role       = role || 'admin';

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Only allow creating admin or super-admin
    if (!['admin', 'super-admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or super-admin' });
    }

    // Enforce MAX_SUPER_ADMINS cap
    if (role === 'super-admin') {
      const maxSuperAdmins = parseInt(process.env.MAX_SUPER_ADMINS) || 2;
      const currentCount   = await User.countDocuments({ role: 'super-admin' });
      if (currentCount >= maxSuperAdmins) {
        return res.status(400).json({
          message: `Maximum Super Admin limit (${maxSuperAdmins}) reached`,
        });
      }
    }

    // Password strength
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ message: pwError });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      password,
      role,
      department: department || null,
      isApproved: true,  // Created by Super Admin — auto-approved
      isActive:   true,
    });

    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'ADMIN_CREATED',
      userId: user._id,
      adminId: req.user._id,
      note: `${role === 'super-admin' ? 'Super Admin' : 'Admin'} account created for: ${user.name} (${user.email}) by super admin: ${req.user.name}`
    });

    res.status(201).json({
      message: `${role === 'super-admin' ? 'Super Admin' : 'Admin'} account created successfully`,
      user:    userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update User Status ────────────────────────────────────
// @desc  Super Admin/Admin approve/suspend/activate, or change role
// @route PUT /api/users/:id/status
// @access Admin+
const updateUserStatus = async (req, res) => {
  try {
    const { isApproved, isActive, role } = req.body;

    // Prevent modifying own status
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot modify your own account status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Security checks for standard Admin
    if (req.user.role === 'admin') {
      // Admins can only modify 'user' role accounts
      if (user.role !== 'user') {
        return res.status(403).json({ message: 'You do not have permission to modify this account type' });
      }
      // Admins cannot change roles
      if (role && role !== user.role) {
        return res.status(403).json({ message: 'You do not have permission to change user roles' });
      }
    }

    // Track if we're approving for the first time (to send notification)
    const wasNotApproved = !user.isApproved;

    if (typeof isApproved === 'boolean') user.isApproved = isApproved;
    if (typeof isActive   === 'boolean') user.isActive   = isActive;

    // Role change — validate super-admin cap (Super Admin only)
    if (role && role !== user.role) {
      if (!['user', 'admin', 'super-admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      if (role === 'super-admin') {
        const maxSuperAdmins = parseInt(process.env.MAX_SUPER_ADMINS) || 2;
        const currentCount   = await User.countDocuments({ role: 'super-admin' });
        if (currentCount >= maxSuperAdmins) {
          return res.status(400).json({
            message: `Maximum Super Admin limit (${maxSuperAdmins}) reached`,
          });
        }
      }
      user.role = role;
    }

    await user.save();

    res.json({ message: 'User status updated', user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Delete User ───────────────────────────────────────────
// @desc  Delete a user account
//        Super Admin: can delete users, admins, other super-admins (not self)
//        Admin: can delete 'user' accounts only
// @route DELETE /api/users/:id
// @access Admin+
const deleteUser = async (req, res) => {
  try {
    // Prevent deleting own account
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Admin can only delete 'user' role accounts
    if (req.user.role === 'admin' && user.role !== 'user') {
      return res.status(403).json({ message: 'Admins can only delete user accounts' });
    }

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createUserAccount = async (req, res) => {
  try {
    let { name, email, password } = req.body;
    name  = sanitizeText(name);
    email = (email || '').toLowerCase().trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ message: pwError });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({
      name,
      email,
      password,
      role: 'user',
      isApproved: true,
      isActive: true,
    });

    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'ADMIN_CREATED',
      userId: user._id,
      adminId: req.user._id,
      note: `User account created for: ${user.name} (${user.email}) by super admin: ${req.user.name}`
    });

    res.status(201).json({
      message: 'User account created successfully',
      user: userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET User Activity Details (Admin/Super Admin only) ───────
const getUserActivity = async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — Admins and Super Admins only' });
    }

    const userId = req.params.id;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const Ticket = require('../models/Ticket');
    const TicketLog = require('../models/TicketLog');

    // 1. Tickets Raised by the user
    const ticketsRaised = await Ticket.find({ user_id: userId })
      .populate('assignedToUser', 'name email role')
      .populate('teamId', 'name')
      .sort({ createdAt: -1 });

    // 2. Actions Taken by the user
    const actionsTaken = await TicketLog.find({ 'performedBy.userId': userId })
      .populate('ticketId', 'title')
      .sort({ timestamp: -1 });

    // 3. Performance summary (if they have assigned tickets or are a team user)
    const assignedTickets = await Ticket.find({ assignedToUser: userId });
    const closedTickets = assignedTickets.filter(t => t.status === 'closed');

    let totalResolveTime = 0;
    let fastestResolveTime = null;
    let slowestResolveTime = null;
    let resolvedCount = 0;

    closedTickets.forEach(t => {
      const duration = t.timeTracking?.timeToClose || (t.timeTracking?.closedAt - t.createdAt) || 0;
      if (duration > 0) {
        totalResolveTime += duration;
        resolvedCount++;
        if (fastestResolveTime === null || duration < fastestResolveTime) {
          fastestResolveTime = duration;
        }
        if (slowestResolveTime === null || duration > slowestResolveTime) {
          slowestResolveTime = duration;
        }
      }
    });

    const averageResolveTime = resolvedCount > 0 ? Math.round(totalResolveTime / resolvedCount) : null;
    const { formatDuration } = require('../utils/timeFormat');

    const performance = {
      workloadCount: assignedTickets.filter(t => t.status !== 'closed').length,
      resolvedCount: closedTickets.length,
      averageResolveTime: averageResolveTime !== null ? formatDuration(averageResolveTime) : 'N/A',
      fastestResolveTime: fastestResolveTime !== null ? formatDuration(fastestResolveTime) : 'N/A',
      slowestResolveTime: slowestResolveTime !== null ? formatDuration(slowestResolveTime) : 'N/A',
    };

    res.json({
      user: userResponse(user),
      ticketsRaised,
      actionsTaken,
      performance
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllUsers,
  getUserStats,
  getUserById,
  createAdminAccount,
  updateUserStatus,
  deleteUser,
  createUserAccount,
  getUserActivity,
};
