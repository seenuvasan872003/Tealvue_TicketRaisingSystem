const { guardRoute } = require('../../middleware/guardRoute');
const express = require('express');
const router  = express.Router();
const Team = require('../../models/Team');
const Ticket = require('../../models/Ticket');
const { protect } = require('../../middleware/authMiddleware');
const { requireFeature } = require('../../middleware/roleMiddleware');

const requireTeamAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'team_admin') return next();
  return res.status(403).json({ message: 'Access denied — Team Admins only' });
};

router.get('/teams/dashboard', protect, requireTeamAdmin, requireFeature('team_dashboard'), async (req, res) => {
  try {
    const team = await Team.findOne({ teamAdmin: req.user._id }).populate('teamAdmin', 'name email');
    if (!team) {
      return res.json({ teams: [], summary: { totalTeams: 0, totalTickets: 0, avgCompletionRate: 0, autoAllocatedCount: 0 } });
    }

    const [total, open, inProgress, closed, transferred, underReview, declined] = await Promise.all([
      Ticket.countDocuments({ $or: [{ teamId: team._id }, { reallocatedFromTeamId: team._id }] }),
      Ticket.countDocuments({ teamId: team._id, status: 'open', allocationStatus: { $ne: 'transferred_to_admin' }, approvalStatus: { $nin: ['rejected', 'suspended'] } }),
      Ticket.countDocuments({ teamId: team._id, status: 'in-progress', allocationStatus: { $ne: 'transferred_to_admin' }, approvalStatus: { $nin: ['rejected', 'suspended'] } }),
      Ticket.countDocuments({ teamId: team._id, status: 'closed', allocationStatus: { $ne: 'transferred_to_admin' }, approvalStatus: { $nin: ['rejected', 'suspended'] } }),
      Ticket.countDocuments({ $or: [{ teamId: team._id, allocationStatus: 'transferred_to_admin' }, { reallocatedFromTeamId: team._id }] }),
      Ticket.countDocuments({ teamId: team._id, approvalStatus: 'suspended' }),
      Ticket.countDocuments({ teamId: team._id, approvalStatus: 'rejected' }),
    ]);

    const activeTotal = open + inProgress + closed;
    const completionRate = activeTotal > 0 ? Math.round((closed / activeTotal) * 100) : 0;

    res.json({
      teams: [{
        teamId: team._id,
        name: team.name,
        categories: team.categories,
        isActive: team.isActive,
        teamAdmin: team.teamAdmin ? { name: team.teamAdmin.name, email: team.teamAdmin.email } : null,
        membersCount: team.members ? team.members.length : 0,
        description: team.description,
        total,
        open,
        inProgress,
        closed,
        transferred,
        underReview,
        declined,
        completionRate,
      }],
      summary: {
        totalTeams: 1,
        totalTickets: total,
        avgCompletionRate: completionRate,
        autoAllocatedCount: 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
