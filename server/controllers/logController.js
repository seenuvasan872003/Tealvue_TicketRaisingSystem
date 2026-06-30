const ActivityLog = require('../models/ActivityLog');
const ClientLog = require('../models/ClientLog');

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

const saveClientLog = async (req, res) => {
  try {
    const logData = { ...req.body };
    
    // Attach userId if request is authenticated
    if (req.user && req.user._id) {
      logData.userId = req.user._id;
    }

    const log = await ClientLog.create(logData);
    res.status(201).json({ success: true, logId: log._id });
  } catch (err) {
    console.error('[ClientLog Server Error] Failed to write client log:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route   GET /api/logs/client
// @access  Admin + Super Admin
const getClientLogs = async (req, res) => {
  try {
    const logs = await ClientLog.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getActivityLogs, saveClientLog, getClientLogs };

