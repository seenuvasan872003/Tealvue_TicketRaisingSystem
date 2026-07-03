const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const User = require('../../models/User');
const { getUserStats } = require('../../controllers/userController');
const { protect } = require('../../middleware/authMiddleware');
const { requireAdmin, requireFeature } = require('../../middleware/roleMiddleware');

router.get('/users', ...guardRoute('all_users'), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    // Restrict standard admin from viewing other admins or super-admins
    const query = {
      role: { $in: ['user', 'team_admin', 'team_user'] }
    };

    if (status === 'pending')   query.isApproved = false;
    if (status === 'active')    query.isActive   = true;
    if (status === 'suspended') query.isActive   = false;

    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/users/stats', ...guardRoute('all_users'), getUserStats);

module.exports = router;
