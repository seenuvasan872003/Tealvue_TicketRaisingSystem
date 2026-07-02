const Team = require('../models/Team');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @route   GET /api/teams
// @access  Admin + Super Admin
const getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('teamAdmin', 'name email avatar isActive')
      .populate('members', 'name email avatar isActive')
      .populate('createdBy', 'name email');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   GET /api/teams/:id
// @access  Super Admin + Admin + Team Admin (own team)
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('teamAdmin', 'name email avatar isActive')
      .populate('members', 'name email avatar isActive')
      .populate('createdBy', 'name email');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Role check: Team Admin can only access their own team
    if (req.user.role === 'team_admin' && team.teamAdmin?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied — own team only' });
    }

    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   POST /api/teams
// @access  Super Admin
const createTeam = async (req, res) => {
  try {
    const { name, categories, description, teamAdminName, teamAdminEmail, teamAdminPassword } = req.body;
    
    if (!name || !categories || categories.length === 0 || !teamAdminName || !teamAdminEmail || !teamAdminPassword) {
      return res.status(400).json({ message: 'Team name, categories, and Team Admin details are required' });
    }

    // 1. Check if email already exists in User collection
    const userExists = await User.findOne({ email: teamAdminEmail.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'Admin user email already exists' });
    }

    // 2. Create the Team Admin user
    const teamAdmin = new User({
      name: teamAdminName,
      email: teamAdminEmail,
      password: teamAdminPassword,
      role: 'team_admin',
      isApproved: true,
      isActive: true,
    });
    await teamAdmin.save();

    const team = new Team({
      name,
      categories,
      description,
      teamAdmin: teamAdmin._id,
      teamAdminPassword: teamAdminPassword,
      members: [],
      isActive: true,
      createdBy: req.user._id,
    });
    await team.save();

    // 4. Log Action
    const ActivityLog  = require('../models/ActivityLog');
    const RoleFeature  = require('../models/RoleFeature');
    const ROLE_DEFAULTS = require('../config/roleDefaults');

    await ActivityLog.create({
      action: 'TEAM_CREATED',
      teamId: team._id,
      adminId: req.user._id,
      note: `Team "${team.name}" created with Team Admin "${teamAdmin.name}" by super admin: ${req.user.name}`
    });

    // Auto-create feature assignment for new Team Admin
    try {
      const defaults = ROLE_DEFAULTS['team_admin'] || ['dashboard'];
      await RoleFeature.create({ userId: teamAdmin._id, role: 'team_admin', features: defaults });
    } catch (rfErr) {
      console.error('[RoleFeature] Failed to auto-create for team admin:', rfErr.message);
    }

    console.log(`[EMAIL] Welcome email with login credentials would be sent to Team Admin: ${teamAdmin.email}`);

    res.status(201).json({ team, teamAdmin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   PUT /api/teams/:id
// @access  Super Admin
const updateTeam = async (req, res) => {
  try {
    const { name, categories, description, isActive, teamAdminId } = req.body;
    
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (name !== undefined) team.name = name;
    if (categories !== undefined) team.categories = categories;
    if (description !== undefined) team.description = description;
    if (isActive !== undefined) team.isActive = isActive;
    if (teamAdminId !== undefined) {
      // Check if new admin exists and is a team_admin
      const newAdmin = await User.findById(teamAdminId);
      if (!newAdmin || newAdmin.role !== 'team_admin') {
        return res.status(400).json({ message: 'Invalid Team Admin user selected' });
      }
      team.teamAdmin = teamAdminId;
    }

    await team.save();

    // Log action
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'TEAM_UPDATED',
      teamId: team._id,
      adminId: req.user._id,
      note: `Team updated: ${team.name} by super admin: ${req.user.name}`
    });

    const populated = await Team.findById(team._id)
      .populate('teamAdmin', 'name email avatar isActive')
      .populate('members', 'name email avatar isActive');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   DELETE /api/teams/:id
// @access  Super Admin
const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if team has active tickets (open or in-progress)
    const activeTicketsCount = await Ticket.countDocuments({ teamId: team._id, status: { $ne: 'closed' } });
    if (activeTicketsCount > 0) {
      return res.status(400).json({ message: 'Cannot delete team with active/unresolved tickets' });
    }

    // Delete all associated members of role team_user belonging ONLY to this team?
    // Let's just remove the Team document
    await team.deleteOne();
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   GET /api/teams/:id/members
// @access  Team Admin (own team) + Super Admin
const getTeamMembers = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('members', 'name email avatar isActive createdAt');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Guard
    if (req.user.role === 'team_admin' && team.teamAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied — own team only' });
    }

    // Populate tickets assigned and closed for each member
    const membersList = [];
    for (const member of team.members) {
      const [assignedCount, closedCount] = await Promise.all([
        Ticket.countDocuments({ assignedToUser: member._id }),
        Ticket.countDocuments({ assignedToUser: member._id, status: 'closed' }),
      ]);
      membersList.push({
        _id: member._id,
        name: member.name,
        email: member.email,
        avatar: member.avatar,
        isActive: member.isActive,
        createdAt: member.createdAt,
        assignedCount,
        closedCount
      });
    }

    res.json(membersList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   POST /api/teams/:id/members
// @access  Team Admin (own team) + Super Admin
const addTeamMember = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Guard
    if (req.user.role === 'team_admin' && team.teamAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied — own team only' });
    }

    // Check if user email exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'User email already exists' });
    }

    // Create Team User record
    const teamUser = new User({
      name,
      email,
      password,
      role: 'team_user',
      isApproved: true,
      isActive: true,
    });
    await teamUser.save();

    // Push to team members array
    team.members.push(teamUser._id);
    await team.save();

    // Log action
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'USER_CREATED',
      userId: teamUser._id,
      adminId: req.user._id,
      note: `Team User "${teamUser.name}" created and added to Team "${team.name}"`
    });

    res.status(201).json(teamUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   DELETE /api/teams/:id/members/:uid
// @access  Team Admin (own team) + Super Admin
const deleteTeamMember = async (req, res) => {
  try {
    const { id, uid } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Guard
    if (req.user.role === 'team_admin' && team.teamAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied — own team only' });
    }

    // Remove from team members array
    team.members = team.members.filter(m => m.toString() !== uid);
    await team.save();

    // Optionally delete the user entirely or just mark as suspended / remove from team
    const memberUser = await User.findById(uid);
    if (memberUser) {
      memberUser.isActive = false;
      await memberUser.save();
    }

    res.json({ message: 'Member removed from team successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   GET /api/teams/:id/performance
// @access  Admin + Super Admin + Team Admin (own team)
const getTeamPerformance = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('teamAdmin', 'name email')
      .populate('members', 'name email avatar isActive');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Guard
    if (req.user.role === 'team_admin' && team.teamAdmin?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied — own team only' });
    }

    // Team wide stats
    const [total, open, inProgress, closed, transferred] = await Promise.all([
      Ticket.countDocuments({ $or: [{ teamId: team._id }, { reallocatedFromTeamId: team._id }] }),
      Ticket.countDocuments({ teamId: team._id, status: 'open', allocationStatus: { $ne: 'transferred_to_admin' } }),
      Ticket.countDocuments({ teamId: team._id, status: 'in-progress', allocationStatus: { $ne: 'transferred_to_admin' } }),
      Ticket.countDocuments({ teamId: team._id, status: 'closed', allocationStatus: { $ne: 'transferred_to_admin' } }),
      Ticket.countDocuments({ $or: [{ teamId: team._id, allocationStatus: 'transferred_to_admin' }, { reallocatedFromTeamId: team._id }] }),
    ]);
    const activeTotal = open + inProgress + closed;
    const completionRate = activeTotal > 0 ? Math.round((closed / activeTotal) * 100) : 100;

    // Per member metrics
    const memberPerformance = [];
    for (const member of team.members) {
      const [mTotal, mOpen, mInProgress, mClosed] = await Promise.all([
        Ticket.countDocuments({ assignedToUser: member._id }),
        Ticket.countDocuments({ assignedToUser: member._id, status: 'open' }),
        Ticket.countDocuments({ assignedToUser: member._id, status: 'in-progress' }),
        Ticket.countDocuments({ assignedToUser: member._id, status: 'closed' }),
      ]);
      memberPerformance.push({
        _id: member._id,
        name: member.name,
        email: member.email,
        avatar: member.avatar,
        isActive: member.isActive,
        total: mTotal,
        open: mOpen,
        inProgress: mInProgress,
        closed: mClosed,
        completionRate: mTotal > 0 ? Math.round((mClosed / mTotal) * 100) : 0,
      });
    }

    // Weekly closed tickets (last 8 weeks)
    const weeklyData = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const count = await Ticket.countDocuments({
        teamId: team._id,
        status: 'closed',
        updatedAt: { $gte: start, $lt: end }
      });
      weeklyData.push({
        week: `Wk -${i}`,
        count
      });
    }

    // Monthly Closed Data (last 6 months)
    const monthlyClosedData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1);

      const closedCount = await Ticket.countDocuments({
        teamId: team._id,
        status: 'closed',
        updatedAt: { $gte: start, $lt: end }
      });
      monthlyClosedData.push({
        month: monthNames[month],
        closed: closedCount
      });
    }

    // Paginated and Filtered Tickets Allocation History
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    
    const ticketQuery = { teamId: team._id };
    if (req.query.status) {
      ticketQuery.status = req.query.status;
    }
    if (req.query.startDate || req.query.endDate) {
      ticketQuery.createdAt = {};
      if (req.query.startDate) {
        ticketQuery.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        ticketQuery.createdAt.$lte = end;
      }
    }

    const totalTicketsCount = await Ticket.countDocuments(ticketQuery);
    const pages = Math.ceil(totalTicketsCount / limit) || 1;

    const tickets = await Ticket.find(ticketQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      team: {
        name: team.name,
        categories: team.categories,
        isActive: team.isActive,
        teamAdmin: team.teamAdmin ? { name: team.teamAdmin.name, email: team.teamAdmin.email } : null,
        teamAdminPassword: team.teamAdminPassword || 'password123'
      },
      stats: { total, open, inProgress, closed, transferred, completionRate },
      memberPerformance,
      weeklyData,
      monthlyClosedData,
      tickets,
      pages
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   GET /api/teams/dashboard
// @access  Admin + Super Admin
const getTeamsDashboard = async (req, res) => {
  try {
    const teams = await Team.find().populate('teamAdmin', 'name email');
    const result = [];
    
    let totalTickets = 0;
    let totalClosed = 0;
    let totalActive = 0;

    for (const team of teams) {
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
      totalTickets += total;
      totalClosed += closed;
      totalActive += activeTotal;

      result.push({
        teamId: team._id,
        name: team.name,
        categories: team.categories,
        isActive: team.isActive,
        teamAdmin: team.teamAdmin ? { name: team.teamAdmin.name, email: team.teamAdmin.email } : null,
        teamAdminPassword: team.teamAdminPassword || 'password123',
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
      });
    }

    const autoAllocatedCount = await Ticket.countDocuments({ autoAllocated: true });
    // Average completion rate based on active tickets in teams: Total Closed / Total Active across teams
    const avgCompletionRate = totalActive > 0 ? Math.round((totalClosed / totalActive) * 100) : 0;
    
    res.json({
      teams: result,
      summary: {
        totalTeams: teams.length,
        totalTickets,
        avgCompletionRate,
        autoAllocatedCount
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyTeam = async (req, res) => {
  try {
    let team = null;
    if (req.user.role === 'team_admin') {
      team = await Team.findOne({ teamAdmin: req.user._id })
        .populate('teamAdmin', 'name email avatar')
        .populate('members', 'name email avatar isActive');
    } else if (req.user.role === 'team_user') {
      team = await Team.findOne({ members: req.user._id })
        .populate('teamAdmin', 'name email avatar')
        .populate('members', 'name email avatar isActive');
    }
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found for this user' });
    }
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   GET /api/teams/categories
// @access  Protected (any logged-in user can access to view options)
const getCategories = async (req, res) => {
  try {
    const defaultCategories = ['General', 'Technical', 'Billing', 'HR', 'Other'];
    
    // Find distinct categories defined in all teams
    const teamCategories = await Team.distinct('categories');
    
    // Find categories in the Category model
    const Category = require('../models/Category');
    const customModels = await Category.find().distinct('name');

    // Merge, deduplicate, filter empty/null, and sort
    const allCategories = Array.from(
      new Set([
        ...defaultCategories,
        ...teamCategories.filter(c => typeof c === 'string' && c.trim() !== ''),
        ...customModels
      ])
    ).sort((a, b) => a.localeCompare(b));
    
    res.json(allCategories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
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
};
