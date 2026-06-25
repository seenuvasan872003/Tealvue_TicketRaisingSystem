// ============================================================
//  server/controllers/notificationController.js
// ============================================================

const Notification = require('../models/Notification');

// @desc  Get current user's paginated notifications
// @route GET /api/notifications
// @access Private
const getAllNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { recipientId: req.user._id };

    // Get unread count (recipientId = req.user._id, isRead = false)
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false
    });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      unreadCount,
      notifications
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get fast count of unread notifications for polling
// @route GET /api/notifications/unread-count
// @access Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Mark a specific notification as read
// @route PUT /api/notifications/:id/read
// @access Private
const markRead = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      recipientId: req.user._id
    });

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notif.isRead = true;
    notif.readAt = Date.now();
    await notif.save();

    res.json({ message: 'Notification marked as read', notification: notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Mark all unread notifications as read
// @route PUT /api/notifications/mark-all-read
// @access Private
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: Date.now()
        }
      }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Delete a notification
// @route DELETE /api/notifications/:id
// @access Private
const deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user._id
    });

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification successfully deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification
};
