const express = require('express');
const router = express.Router();
const {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  deleteTeamMember,
  getTeamPerformance,
  getTeamsDashboard,
  getMyTeam,
} = require('../controllers/teamController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin, requireSuperAdmin } = require('../middleware/roleMiddleware');

// Custom middle guard that allows Admin, Super Admin, or the Team Admin of the team
const requireAdminSuperOrTeamAdmin = async (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'super-admin') {
    return next();
  }
  if (req.user.role === 'team_admin') {
    try {
      const Team = require('../models/Team');
      const team = await Team.findById(req.params.id || req.params.teamId);
      if (team && team.teamAdmin.toString() === req.user._id.toString()) {
        return next();
      }
    } catch (err) {
      // fallback to forbidden
    }
  }
  return res.status(403).json({ message: 'Access denied — admin or own team admin only' });
};

// GET all teams - Admin + Super Admin
router.get('/', protect, requireAdmin, getTeams);

// GET stats dashboard summary - Admin + Super Admin
router.get('/dashboard', protect, requireAdmin, getTeamsDashboard);

// GET own team - Team Admin or Team User
router.get('/mine', protect, getMyTeam);

// GET team members - Team Admin (own team) + Super Admin
router.get('/:id/members', protect, requireAdminSuperOrTeamAdmin, getTeamMembers);

// POST add team member - Team Admin (own team) + Super Admin
router.post('/:id/members', protect, requireAdminSuperOrTeamAdmin, addTeamMember);

// DELETE team member - Team Admin (own team) + Super Admin
router.delete('/:id/members/:uid', protect, requireAdminSuperOrTeamAdmin, deleteTeamMember);

// GET team performance - Admin, Super Admin, or own Team Admin
router.get('/:id/performance', protect, requireAdminSuperOrTeamAdmin, getTeamPerformance);

// GET single team - Admin, Super Admin, or own Team Admin
router.get('/:id', protect, requireAdminSuperOrTeamAdmin, getTeamById);

// POST create team - Super Admin only
router.post('/', protect, requireSuperAdmin, createTeam);

// PUT edit team - Super Admin only
router.put('/:id', protect, requireSuperAdmin, updateTeam);

// DELETE team - Super Admin only
router.delete('/:id', protect, requireSuperAdmin, deleteTeam);

module.exports = router;
