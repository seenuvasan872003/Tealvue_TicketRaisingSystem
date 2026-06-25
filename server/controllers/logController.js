const ActivityLog = require('../models/ActivityLog');

// @route   GET /api/logs
// @access  Admin + Super Admin
const getActivityLogs = async (req, res) => {
  try {
    const { range } = req.query;
    let cutoff = new Date();

    if (range === 'daily') {
      cutoff.setHours(cutoff.getHours() - 24);
    } else if (range === 'weekly') {
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (range === 'monthly') {
      cutoff.setDate(cutoff.getDate() - 30);
    } else {
      // Default to daily if not specified or invalid
      cutoff.setHours(cutoff.getHours() - 24);
    }

    const query = {
      createdAt: { $gte: cutoff },
    };
    if (req.query.teamId) {
      query.teamId = req.query.teamId;
    }

    const logs = await ActivityLog.find(query)
      .populate('ticketId', 'title')
      .populate('teamId', 'name')
      .populate('userId', 'name email role')
      .populate('adminId', 'name email role')
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getActivityLogs };
