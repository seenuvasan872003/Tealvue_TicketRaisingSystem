const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { getTeamsDashboard } = require('../../controllers/teamController');
const { protect } = require('../../middleware/authMiddleware');
const { requireSuperAdmin, requireFeature } = require('../../middleware/roleMiddleware');

router.get('/teams/dashboard', ...guardRoute('team_dashboard'), getTeamsDashboard);

module.exports = router;
