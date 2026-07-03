const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const { getAllUsers, getUserStats } = require('../../controllers/userController');
const { protect } = require('../../middleware/authMiddleware');
const { requireSuperAdmin, requireFeature } = require('../../middleware/roleMiddleware');

router.get('/users', ...guardRoute('all_users'), getAllUsers);
router.get('/users/stats', ...guardRoute('all_users'), getUserStats);

module.exports = router;
