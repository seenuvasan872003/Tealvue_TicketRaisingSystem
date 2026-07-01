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
  getCategories,
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

// GET all teams - Admin + Super Admin + Team Admin + Team User (for ticket reallocation dropdown)
const requireStaff = (req, res, next) => {
  if (req.user && ['admin', 'super-admin', 'team_admin', 'team_user'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied — staff only' });
};
router.get('/', protect, requireStaff, getTeams);

// GET stats dashboard summary - Admin + Super Admin
router.get('/dashboard', protect, requireAdmin, getTeamsDashboard);

// GET own team - Team Admin or Team User
router.get('/mine', protect, getMyTeam);

// GET all active categories (merged defaults and team-specific)
router.get('/categories', protect, getCategories);

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

// Custom Category routes (Super Admin only)
const Category = require('../models/Category');
router.post('/categories', protect, requireSuperAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const formatted = name.trim().replace(/\b\w/g, l => l.toUpperCase());
    
    const exists = await Category.findOne({ name: formatted });
    if (exists) return res.status(400).json({ message: 'Category already exists' });
    
    const cat = new Category({ name: formatted, createdBy: req.user._id });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/categories/:oldName', protect, requireSuperAdmin, async (req, res) => {
  try {
    const { oldName } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const formatted = name.trim().replace(/\b\w/g, l => l.toUpperCase());

    const cat = await Category.findOne({ name: oldName });
    if (cat) {
      cat.name = formatted;
      await cat.save();
    } else {
      // Create if it doesn't exist yet (migrating a legacy category to model)
      const newCat = new Category({ name: formatted, createdBy: req.user._id });
      await newCat.save();
    }
    
    // Dynamically update any teams matching oldName category
    const Team = require('../models/Team');
    await Team.updateMany(
      { categories: oldName },
      { $set: { "categories.$[elem]": formatted } },
      { arrayFilters: [{ elem: oldName }] }
    );

    res.json({ message: 'Category updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/categories/:name', protect, requireSuperAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    await Category.deleteOne({ name });
    
    // Remove category option from teams
    const Team = require('../models/Team');
    await Team.updateMany(
      { categories: name },
      { $pull: { categories: name } }
    );
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
