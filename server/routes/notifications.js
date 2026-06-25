// ============================================================
//  server/routes/notifications.js  —  Notification Routes
// ============================================================

const express = require('express');
const router  = express.Router();

const {
  getAllNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification
} = require('../controllers/notificationController');

const { protect } = require('../middleware/authMiddleware');

// Mount point: /api/notifications
router.get('/',               protect, getAllNotifications);
router.get('/unread-count',   protect, getUnreadCount);
router.put('/mark-all-read',  protect, markAllRead);
router.put('/:id/read',       protect, markRead);
router.delete('/:id',         protect, deleteNotification);

// Webhook Demo Receiver Route (Public)
router.post('/webhook-demo', (req, res) => {
  console.log('⚡ [WEBHOOK RECEIVER] Successfully received notification webhook payload!');
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).json({ status: 'SUCCESS', received: true });
});

module.exports = router;
