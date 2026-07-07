const UserActivityLog    = require('../models/UserActivityLog');
const UserSession        = require('../models/UserSession');
const UserTriggerSummary = require('../models/UserTriggerSummary');
const User               = require('../models/User');

// ── Super Admin: get all user activity logs (paginated, filterable) ──
const getAllActivity = async (req, res) => {
  try {
    const { userId, role, eventType, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (userId)    filter.userId    = userId;
    if (role)      filter.userRole  = role;
    if (eventType) filter.eventType = eventType;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to)   filter.timestamp.$lte = new Date(to);
    }

    const total = await UserActivityLog.countDocuments(filter);
    const logs  = await UserActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('userId', 'name email role avatar');

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get all activity for a specific user ──
const getUserActivity = async (req, res) => {
  try {
    const { uid } = req.params;
    const { eventType, page = 1, limit = 20 } = req.query;
    const filter = { userId: uid };
    if (eventType) filter.eventType = eventType;

    const total = await UserActivityLog.countDocuments(filter);
    const logs  = await UserActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const user = await User.findById(uid).select('name email role avatar createdAt');
    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get trigger summary for a specific user ──
const getUserSummary = async (req, res) => {
  try {
    const { uid } = req.params;
    const summary = await UserTriggerSummary.findOne({ userId: uid });
    const user    = await User.findById(uid).select('name email role avatar createdAt');
    res.json({ summary, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get all sessions (super admin all, or filter by userId) ──
const getAllSessions = async (req, res) => {
  try {
    const { userId, isActive, from, to } = req.query;
    const filter = {};
    if (userId)            filter.userId   = userId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (from || to) {
      filter.loginAt = {};
      if (from) filter.loginAt.$gte = new Date(from);
      if (to)   filter.loginAt.$lte = new Date(to);
    }
    const sessions = await UserSession.find(filter).sort({ loginAt: -1 }).limit(200);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get sessions for a specific user ──
const getUserSessions = async (req, res) => {
  try {
    const { uid } = req.params;
    const sessions = await UserSession.find({ userId: uid }).sort({ loginAt: -1 });
    const user     = await User.findById(uid).select('name email role avatar createdAt');
    res.json({ sessions, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Summary stats across all users (for dashboard cards) ──
const getDashboardStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalUsersTracked, loginsToday, triggersToday, activeSessions] = await Promise.all([
      UserTriggerSummary.countDocuments(),
      UserActivityLog.countDocuments({ eventType: 'LOGIN', timestamp: { $gte: todayStart } }),
      UserActivityLog.countDocuments({ eventType: 'API_TRIGGER', timestamp: { $gte: todayStart } }),
      UserSession.countDocuments({ isActive: true })
    ]);

    // Active users = last active within 5 mins
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsers = await UserTriggerSummary.countDocuments({ lastActiveAt: { $gte: fiveMinAgo } });

    res.json({ totalUsersTracked, loginsToday, triggersToday, activeSessions, activeUsers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get all unique users that have activity ──
const getAllTrackedUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.userRole = role;
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } }
      ];
    }

    // For admin — restrict roles
    if (req.restrictRoles) filter.userRole = { $in: req.restrictRoles };

    const total    = await UserTriggerSummary.countDocuments(filter);
    const summaries = await UserTriggerSummary.find(filter)
      .sort({ lastActiveAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Hydrate with user data
    const userIds = summaries.map(s => s.userId);
    const users   = await User.find({ _id: { $in: userIds } }).select('name email role avatar createdAt isActive');
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const data = summaries.map(s => ({
      ...s.toObject(),
      user: userMap[s.userId.toString()] || null
    }));

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    res.json({ data, total, page: Number(page), pages: Math.ceil(total / limit), fiveMinAgo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllActivity, getUserActivity, getUserSummary, getAllSessions, getUserSessions, getDashboardStats, getAllTrackedUsers };
