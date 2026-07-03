const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { getActivityLogs } = require('../../controllers/logController');
const { getStats, getGrowthData, getStatusBreakdown, getAdminWorkload } = require('../../controllers/ticketController');
const { protect } = require('../../middleware/authMiddleware');
const { requireFeature } = require('../../middleware/roleMiddleware');

const requireTeamAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'team_admin') return next();
  return res.status(403).json({ message: 'Access denied — Team Admins only' });
};

router.get('/', protect, requireTeamAdmin, requireFeature('activity_logs'), getActivityLogs);
router.get('/stats', protect, requireTeamAdmin, requireFeature('activity_logs'), getStats);
router.get('/growth', protect, requireTeamAdmin, requireFeature('activity_logs'), getGrowthData);
router.get('/breakdown', protect, requireTeamAdmin, requireFeature('activity_logs'), getStatusBreakdown);
router.get('/workload', protect, requireTeamAdmin, requireFeature('activity_logs'), getAdminWorkload);

module.exports = router;
