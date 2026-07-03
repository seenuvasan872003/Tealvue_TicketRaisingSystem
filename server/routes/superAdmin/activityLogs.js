const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { getActivityLogs } = require('../../controllers/logController');
const { getStats, getGrowthData, getStatusBreakdown, getAdminWorkload } = require('../../controllers/ticketController');
const { protect } = require('../../middleware/authMiddleware');
const { requireSuperAdmin, requireFeature } = require('../../middleware/roleMiddleware');

router.get('/', ...guardRoute('activity_logs'), getActivityLogs);
router.get('/stats', ...guardRoute('activity_logs'), getStats);
router.get('/growth', ...guardRoute('activity_logs'), getGrowthData);
router.get('/breakdown', ...guardRoute('activity_logs'), getStatusBreakdown);
router.get('/workload', ...guardRoute('activity_logs'), getAdminWorkload);

module.exports = router;
