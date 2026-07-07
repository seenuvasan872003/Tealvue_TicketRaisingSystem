const express = require('express');
const router  = express.Router();
const { guardRoute } = require('../../middleware/guardRoute');
const User    = require('../../models/User');
const Team    = require('../../models/Team');
const { getUserActivity, getUserSummary, getUserSessions } = require('../../controllers/userActivityController');

// Validate target userId is a team_user in team admin's own team
const validateTeamMember = async (req, res, next) => {
  try {
    const team = await Team.findOne({ teamAdmin: req.user._id });
    if (!team) return res.status(403).json({ message: 'You do not manage a team' });

    const targetUser = await User.findById(req.params.uid).select('role');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (targetUser.role !== 'team_user') return res.status(403).json({ message: 'Target user is not a team_user' });

    const isMember = team.members && team.members.some(m => m.toString() === req.params.uid);
    if (!isMember) return res.status(403).json({ message: 'User is not a member of your team' });

    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.get('/:uid',          ...guardRoute('user_activity_logs'), validateTeamMember, getUserActivity);
router.get('/:uid/summary',  ...guardRoute('user_activity_logs'), validateTeamMember, getUserSummary);
router.get('/:uid/sessions', ...guardRoute('user_activity_logs'), validateTeamMember, getUserSessions);

module.exports = router;
