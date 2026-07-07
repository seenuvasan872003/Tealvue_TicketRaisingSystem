// ============================================================
//  server/controllers/exportController.js
// ============================================================

const { Parser } = require('json2csv');
const Ticket     = require('../models/Ticket');
const User       = require('../models/User');
const Feedback   = require('../models/Feedback');
const UserActivityLog = require('../models/UserActivityLog');

const toCSV = (fields, data) => {
  const parser = new Parser({ fields });
  return parser.parse(data);
};

const sendCSV = (res, csv, filename) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
};

// ── Export Tickets ────────────────────────────────────────────
const exportTickets = async (req, res) => {
  try {
    const { format = 'csv', status, priority, category, from, to } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }
    const tickets = await Ticket.find(filter)
      .populate('user_id',       'name email')
      .populate('teamId',        'name')
      .populate('assignedToUser','name')
      .lean();

    const data = tickets.map(t => ({
      'Ticket ID':      t._id.toString(),
      'Title':          t.title,
      'Category':       t.category || '',
      'Priority':       t.priority,
      'Status':         t.status,
      'User':           t.user_id?.name || '',
      'User Email':     t.user_id?.email || '',
      'Team':           t.teamId?.name || '',
      'Assigned To':    t.assignedToUser?.name || '',
      'Created':        t.createdAt?.toISOString() || '',
      'Closed':         t.closedAt?.toISOString() || '',
      'Reopen Count':   t.reopenCount || 0
    }));

    if (format === 'json') return res.json(data);
    const fields = Object.keys(data[0] || {});
    sendCSV(res, toCSV(fields, data), 'tickets-export');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Export Users ──────────────────────────────────────────────
const exportUsers = async (req, res) => {
  try {
    const { format = 'csv', role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).lean();
    const data  = users.map(u => ({
      'Name':         u.name,
      'Email':        u.email,
      'Role':         u.role,
      'Active':       u.isActive ? 'Yes' : 'No',
      'Approved':     u.isApproved ? 'Yes' : 'No',
      'Reopen Flags': u.reopenFlagCount || 0,
      'Created At':   u.createdAt?.toISOString() || ''
    }));
    if (format === 'json') return res.json(data);
    const fields = Object.keys(data[0] || {});
    sendCSV(res, toCSV(fields, data), 'users-export');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Export Feedback ───────────────────────────────────────────
const exportFeedback = async (req, res) => {
  try {
    const { format = 'csv', teamId, from, to } = req.query;
    const filter = { isSubmitted: true };
    if (teamId) filter.teamId = teamId;
    if (from || to) {
      filter.submittedAt = {};
      if (from) filter.submittedAt.$gte = new Date(from);
      if (to)   filter.submittedAt.$lte = new Date(to);
    }
    const feedbacks = await Feedback.find(filter)
      .populate('ticketId','title')
      .populate('userId',  'name email')
      .populate('teamId',  'name')
      .populate('teamUserId', 'name email')
      .lean();
    const data = feedbacks.map(f => ({
      'Ticket ID':    f.ticketId?._id?.toString() || '',
      'Ticket Title': f.ticketId?.title || '',
      'User':         f.userId?.name || '',
      'User Email':   f.userId?.email || '',
      'Team':         f.teamId?.name || '',
      'Solved By':    f.teamUserId?.name || 'Unassigned',
      'Agent Email':  f.teamUserId?.email || '',
      'Rating':       f.rating,
      'Comment':      f.comment || '',
      'Submitted At': f.submittedAt?.toISOString() || ''
    }));
    if (format === 'json') return res.json(data);
    const fields = Object.keys(data[0] || {});
    sendCSV(res, toCSV(fields, data), 'feedback-export');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Export Activity Logs (super-admin) ────────────────────────
const exportActivityLogs = async (req, res) => {
  try {
    const { format = 'csv', range } = req.query;
    const filter = {};
    if (range === 'daily') {
      const today = new Date(); today.setHours(0,0,0,0);
      filter.timestamp = { $gte: today };
    } else if (range === 'weekly') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filter.timestamp = { $gte: weekAgo };
    } else if (range === 'monthly') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filter.timestamp = { $gte: monthAgo };
    }
    const logs = await UserActivityLog.find(filter).sort({ timestamp: -1 }).limit(5000).lean();
    const data = logs.map(l => ({
      'User':      l.userName  || '',
      'Email':     l.userEmail || '',
      'Role':      l.userRole  || '',
      'Event':     l.eventType,
      'Route':     l.details?.route  || '',
      'Method':    l.details?.method || '',
      'Status':    l.details?.statusCode || '',
      'Timestamp': l.timestamp?.toISOString() || ''
    }));
    if (format === 'json') return res.json(data);
    const fields = Object.keys(data[0] || {});
    sendCSV(res, toCSV(fields, data), 'activity-logs-export');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { exportTickets, exportUsers, exportFeedback, exportActivityLogs };
