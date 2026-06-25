// ============================================================
//  server/controllers/ticketController.js
// ============================================================
//  ROUTES USING THIS:
//    GET    /api/tickets           → getTickets()       [auth, role-filtered]
//    GET    /api/tickets/stats     → getStats()         [admin+]
//    GET    /api/tickets/my-stats  → getMyStats()       [auth]
//    GET    /api/tickets/growth    → getGrowthData()    [admin+]
//    GET    /api/tickets/breakdown → getStatusBreakdown()[admin+]
//    GET    /api/tickets/workload  → getAdminWorkload() [super-admin]
//    GET    /api/tickets/:id       → getTicketById()    [auth]
//    POST   /api/tickets           → createTicket()     [auth]
//    PUT    /api/tickets/:id       → updateTicket()     [auth, scoped]
//    POST   /api/tickets/:id/notes → addInternalNote()  [admin+]
//    DELETE /api/tickets/:id       → deleteTicket()     [auth, scoped]
//
//  NEW TEAM ALLOCATION ROUTES:
//    PUT    /api/tickets/:id/assign-team   → assignTeam()    [admin+]
//    PUT    /api/tickets/:id/assign-member → assignMember()  [team_admin]
//    PUT    /api/tickets/:id/close         → closeTicket()   [team_user]
//    PUT    /api/tickets/:id/due-date      → updateDueDate() [admin+]
// ============================================================

const path         = require('path');
const Ticket       = require('../models/Ticket');
const User         = require('../models/User');
const Team         = require('../models/Team');
const Notification = require('../models/Notification');
const { notify }    = require('../utils/notify');
const { notifyOnce } = require('../utils/notifyOnce');
const createLog = require('../utils/createLog');

// ── Sanitize helper ───────────────────────────────────────
const sanitizeText = (str) =>
  typeof str === 'string' ? str.replace(/[<>{}\$%\^*]/g, '').trim() : str;

// ── Build attachment metadata from multer req.files ───────
const buildAttachments = (files) => {
  if (!files || files.length === 0) return [];
  return files.map((f) => ({
    filename:     f.filename,
    originalName: f.originalname,
    mimetype:     f.mimetype,
    size:         f.size,
    url:          `/uploads/${f.filename}`,
  }));
};

// ── Get Tickets ───────────────────────────────────────────
const getTickets = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 10, needsAttention, showDeclined } = req.query;
    const query = {};

    // Role-based scope filtering
    if (req.user.role === 'user') {
      // Users see only their own tickets
      query.user_id = req.user._id;
    } else if (req.user.role === 'admin') {
      if (showDeclined === 'true') {
        query.approvalStatus = 'rejected';
      } else {
        query.approvalStatus = 'approved';
        if (needsAttention === 'true') {
          query.allocationStatus = { $in: ['pending_admin', 'transferred_to_admin'] };
        }
      }
    } else if (req.user.role === 'team_admin') {
      // Team Admins see tickets assigned to their team or reallocated from their team
      const team = await Team.findOne({ teamAdmin: req.user._id });
      if (team) {
        query.$or = [
          { teamId: team._id, allocationStatus: { $in: ['allocated_team_admin', 'allocated_team_user', 'reallocated_team', 'transferred_to_admin'] } },
          { reallocatedFromTeamId: team._id }
        ];
      } else {
        query.teamId = null; // show none if they have no team
      }
    } else if (req.user.role === 'team_user') {
      // Team Users see only tickets assigned to them directly, or their team's reallocated/transferred tickets
      const team = await Team.findOne({ members: req.user._id });
      if (team) {
        query.$or = [
          { assignedToUser: req.user._id },
          { reallocatedFromTeamId: team._id },
          { teamId: team._id, allocationStatus: 'transferred_to_admin' }
        ];
      } else {
        query.assignedToUser = req.user._id;
      }
    } else if (req.user.role === 'super-admin') {
      if (showDeclined === 'true') {
        query.approvalStatus = 'rejected';
      } else if (needsAttention === 'true') {
        query.allocationStatus = { $in: ['pending_admin', 'transferred_to_admin'] };
      }
    }

    if (status)   query.status   = status;
    if (priority) query.priority = priority;
    if (search)   query.title    = { $regex: search, $options: 'i' };
    if (req.query.teamId) query.teamId = req.query.teamId;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Ticket.countDocuments(query);

    const tickets = await Ticket.find(query)
      .populate('user_id',        'name email avatar')
      .populate('assigned_to',    'name email avatar')
      .populate('assignedToUser', 'name email avatar')
      .populate('teamId',         'name categories')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      tickets,
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get Ticket By ID ──────────────────────────────────────
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('user_id',                   'name email avatar')
      .populate('assigned_to',               'name email avatar')
      .populate('assignedToUser',            'name email avatar')
      .populate('internal_notes.author',     'name email role')
      .populate('teamId',                    'name categories description teamAdmin');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Access control
    if (req.user.role === 'user') {
      if (ticket.user_id._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'admin') {
      if (ticket.approvalStatus !== 'approved') {
        return res.status(403).json({ message: 'Access denied — ticket is suspended or rejected' });
      }
    } else if (req.user.role === 'team_admin') {
      const team = await Team.findOne({ teamAdmin: req.user._id });
      if (!team) {
        return res.status(403).json({ message: 'Access denied — own team tickets only' });
      }
      const isCurrentTeam = ticket.teamId?._id?.toString() === team._id.toString() || ticket.teamId?.toString() === team._id.toString();
      const isOldTeam = ticket.reallocatedFromTeamId?.toString() === team._id.toString();
      if (!isCurrentTeam && !isOldTeam) {
        return res.status(403).json({ message: 'Access denied — own/old team tickets only' });
      }
    } else if (req.user.role === 'team_user') {
      const userTeam = await Team.findOne({ members: req.user._id });
      const isCurrentAssigned = ticket.assignedToUser?._id?.toString() === req.user._id.toString() || ticket.assignedToUser?.toString() === req.user._id.toString();
      const isCurrentTeam = userTeam && (ticket.teamId?._id?.toString() === userTeam._id.toString() || ticket.teamId?.toString() === userTeam._id.toString());
      const isOldTeam = userTeam && ticket.reallocatedFromTeamId?.toString() === userTeam._id.toString();
      if (!isCurrentAssigned && !isOldTeam && !isCurrentTeam) {
        return res.status(403).json({ message: 'Access denied — assigned or team tickets only' });
      }
    }

    // Register Team Admin view to stop 10-minute auto-allocation timer
    if (req.user.role === 'team_admin') {
      if (ticket.allocationStatus === 'allocated_team_admin' && !ticket.teamAdminViewedAt) {
        ticket.teamAdminViewedAt = new Date();
        await ticket.save();
      }
    }

    // Flow 2 — Admin Views Ticket → Notify User (once only)
    if (req.user.role === 'admin') {
      await notifyOnce({
        recipientIds: [ticket.user_id._id || ticket.user_id],
        senderId:     req.user._id,
        senderName:   req.user.name,
        senderRole:   'admin',
        type:         'TICKET_VIEWED_BY_ADMIN',
        ticketId:     ticket._id,
        ticketTitle:  ticket.title,
        message:      `Your ticket "${ticket.title}" is under review.`
      });
    }

    // Flow 4 — Team Admin Views Ticket → Notify User + Admin (once only)
    if (req.user.role === 'team_admin') {
      await notifyOnce({
        recipientIds: [ticket.user_id._id || ticket.user_id, ticket.lastAdminId],
        senderId:     req.user._id,
        senderName:   req.user.name,
        senderRole:   'team_admin',
        type:         'TICKET_VIEWED_BY_TEAM_ADMIN',
        ticketId:     ticket._id,
        ticketTitle:  ticket.title,
        message:      `Team Admin ${req.user.name} is reviewing ticket "${ticket.title}".`
      });
    }

    // Flow 6 — Team User Views Ticket → Notify User + Team Admin + Admin (once only)
    if (req.user.role === 'team_user') {
      const team = await Team.findById(ticket.teamId).populate('teamAdmin');
      if (team && team.teamAdmin) {
        await notifyOnce({
          recipientIds: [ticket.user_id._id || ticket.user_id, team.teamAdmin._id, ticket.lastAdminId],
          senderId:     req.user._id,
          senderName:   req.user.name,
          senderRole:   'team_user',
          type:         'TICKET_VIEWED_BY_TEAM_USER',
          ticketId:     ticket._id,
          ticketTitle:  ticket.title,
          message:      `Agent ${req.user.name} is working on ticket "${ticket.title}".`
        });
      }
    }

    // Auto-transition open → in-progress when admin/super-admin or team_admin/team_user views
    if (
      ['admin', 'super-admin', 'team_admin', 'team_user'].includes(req.user.role) &&
      ticket.status === 'open'
    ) {
      ticket.status_history.push({
        from:      'open',
        to:        'in-progress',
        changedBy: req.user._id,
        changedAt: new Date(),
      });
      ticket.status = 'in-progress';
      await ticket.save();
    }

    const ticketObj = ticket.toObject();

    if (req.user.role === 'team_admin' || req.user.role === 'team_user') {
      const teamQuery = req.user.role === 'team_admin' 
        ? { teamAdmin: req.user._id }
        : { members: req.user._id };
      const userTeam = await Team.findOne(teamQuery);
      if (userTeam) {
        const isOldTeam = ticket.reallocatedFromTeamId?.toString() === userTeam._id.toString();
        const isTransferred = ticket.allocationStatus === 'transferred_to_admin';
        if (isOldTeam || isTransferred) {
          ticketObj._isReadOnlyForTeam = true;
        }
      }
    }

    if (req.user.role === 'user') {
      delete ticketObj.internal_notes;
    } else if (req.user.role === 'super-admin' && ticketObj.user_id) {
      const [totalCount, rejectCount] = await Promise.all([
        Ticket.countDocuments({ user_id: ticketObj.user_id._id }),
        Ticket.countDocuments({ user_id: ticketObj.user_id._id, approvalStatus: 'rejected' })
      ]);
      ticketObj.user_id.totalTicketsSubmitted = totalCount;
      ticketObj.user_id.previousRejectedTickets = rejectCount;
    }

    // Set canEdit edit flag
    if (['admin', 'super-admin'].includes(req.user.role)) {
      ticketObj._canEdit = true;
    } else if (req.user.role === 'team_admin') {
      ticketObj._canEdit = false; // Team Admins assign members, no raw content edit
    } else {
      ticketObj._canEdit = ticket.status !== 'closed' && req.user.role === 'user';
    }

    res.json(ticketObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Create Ticket ─────────────────────────────────────────
const createTicket = async (req, res) => {
  try {
    let { title, description, category } = req.body;

    title       = sanitizeText(title);
    description = sanitizeText(description);
    category    = category ? sanitizeText(category) : null;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const attachments = buildAttachments(req.files);

    const hasCategory = category && category.trim() !== '' && category !== 'No Category' && category !== 'null';
    const categoryVal = hasCategory ? category : null;
    const categorySelectedByUser = hasCategory;

    let teamId = null;
    let allocationStatus = 'pending_admin';
    let autoAllocatedAt = null;
    let teamAdminAllocatedAt = null;

    let matchedTeam = null;
    if (hasCategory) {
      matchedTeam = await Team.findOne({
        categories: categoryVal,
        isActive: true
      });
      if (matchedTeam) {
        teamId = matchedTeam._id;
        allocationStatus = 'allocated_team_admin';
        autoAllocatedAt = new Date();
        teamAdminAllocatedAt = new Date();
      }
    }

    const ticket = await Ticket.create({
      title,
      description,
      category: categoryVal,
      priority: 'low',
      dueDate: null,
      user_id: req.user._id,
      attachments,
      status_history: [{ from: null, to: 'open', changedBy: req.user._id }],
      approvalStatus: 'approved',
      allocationStatus,
      categorySelectedByUser,
      autoAllocatedAt,
      teamAdminAllocatedAt,
      teamId
    });

    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'TICKET_CREATED',
      ticketId: ticket._id,
      userId: req.user._id,
      note: `Ticket created: "${ticket.title}" by user: ${req.user.name}`
    });

    await createLog({
      ticketId: ticket._id,
      action: 'TICKET_CREATED',
      performedBy: req.user,
      metadata: {
        note: `Title: ${ticket.title} | Category: ${ticket.category || 'None'} | Description: ${ticket.description.slice(0, 100)}`
      }
    });

    await createLog({
      ticketId: ticket._id,
      action: 'TICKET_OPENED',
      performedBy: { _id: '000000000000000000000000', name: 'System', email: 'system@tealvue.com', role: 'system' },
      metadata: {
        note: 'Ticket status set to open on creation'
      }
    });

    if (allocationStatus === 'allocated_team_admin') {
      await createLog({
        ticketId: ticket._id,
        action: 'AUTO_ALLOCATED_TEAM_ADMIN',
        performedBy: { _id: '000000000000000000000000', name: 'System', email: 'system@tealvue.com', role: 'system' },
        metadata: {
          teamId: matchedTeam._id,
          teamName: matchedTeam.name,
          note: `Admin auto allocated to the team: ${matchedTeam.name} based on category: ${categoryVal}`
        }
      });

      if (matchedTeam.teamAdmin) {
        await notify({
          recipientIds: [matchedTeam.teamAdmin],
          senderId:     req.user._id,
          senderName:   req.user.name,
          senderRole:   'user',
          type:         'TICKET_CREATED',
          ticketId:     ticket._id,
          ticketTitle:  ticket.title,
          message:      `New ticket auto-allocated to your team: "${ticket.title}"`
        });
      }
    } else {
      await createLog({
        ticketId: ticket._id,
        action: 'AUTO_ALLOCATED_TO_ADMIN_NO_CATEGORY',
        performedBy: { _id: '000000000000000000000000', name: 'System', email: 'system@tealvue.com', role: 'system' },
        metadata: {
          note: hasCategory
            ? `No matching team found for category: ${categoryVal}. Ticket pending admin allocation.`
            : `User submitted ticket without category. Ticket pending admin allocation.`
        }
      });

      const admins = await User.find({ role: 'admin' }).select('_id');
      const adminIds = admins.map(a => a._id);
      await notify({
        recipientIds: adminIds,
        senderId:     req.user._id,
        senderName:   req.user.name,
        senderRole:   'user',
        type:         'TICKET_CREATED',
        ticketId:     ticket._id,
        ticketTitle:  ticket.title,
        message:      `${req.user.name} raised a new ticket (Needs Attention): "${ticket.title}"`
      });
    }

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update Ticket (Admin/Super Admin general edit) ─────────
const updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.user.role === 'user') {
      if (ticket.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (ticket.status === 'closed') {
        return res.status(400).json({ message: 'Cannot edit a closed ticket' });
      }
      const { title, description, category } = req.body;
      if (title)       ticket.title       = sanitizeText(title);
      if (description) ticket.description = sanitizeText(description);
      if (category)    ticket.category    = sanitizeText(category);
    } else if (['admin', 'super-admin'].includes(req.user.role)) {
      // Admins/Super Admins can edit attributes
      const { status, priority, assigned_to, teamId, dueDate } = req.body;
      const prevStatus = ticket.status;

      if (priority && priority !== ticket.priority) {
        ticket.priority = priority;
      }
      if (dueDate !== undefined) {
        ticket.dueDate = dueDate || null;
      }
      if (teamId !== undefined) {
        ticket.teamId = teamId || null;
      }

      if (status && status !== ticket.status) {
        ticket.status_history.push({ from: prevStatus, to: status, changedBy: req.user._id, changedAt: new Date() });
        ticket.status = status;

        const ActivityLog = require('../models/ActivityLog');
        if (status === 'closed') {
          await ActivityLog.create({
            action: 'TICKET_CLOSED',
            ticketId: ticket._id,
            adminId: req.user._id,
            note: `Ticket closed by ${req.user.role}: ${req.user.name}`
          });
          const ticketCreator = await User.findById(ticket.user_id);
          if (ticketCreator) {
            await notify({
              recipientIds: [ticketCreator._id],
              senderId:     req.user._id,
              senderName:   req.user.name,
              senderRole:   req.user.role === 'super-admin' ? 'super_admin' : 'admin',
              type:         'TICKET_RESOLVED',
              ticketId:     ticket._id,
              ticketTitle:  ticket.title,
              message:      `Your ticket "${ticket.title}" has been resolved and closed.`
            });
          }
        } else {
          await ActivityLog.create({
            action: 'STATUS_UPDATED',
            ticketId: ticket._id,
            adminId: req.user._id,
            note: `Status updated from "${prevStatus}" to "${status}" by ${req.user.role}: ${req.user.name}`
          });
        }
      }

      if (assigned_to !== undefined) {
        const prevAssigned = ticket.assigned_to?.toString();
        ticket.assigned_to = assigned_to || null;

        if (assigned_to && assigned_to !== prevAssigned) {
          const assignedAdmin = await User.findById(assigned_to);
          if (assignedAdmin) {
            await notify({
              recipientIds: [assignedAdmin._id],
              senderId:     req.user._id,
              senderName:   req.user.name,
              senderRole:   req.user.role === 'super-admin' ? 'super_admin' : 'admin',
              type:         'TICKET_ALLOCATED_TO_TEAM_USER',
              ticketId:     ticket._id,
              ticketTitle:  ticket.title,
              message:      `You have been assigned ticket: "${ticket.title}"`
            });
          }
        }
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updated = await ticket.save();
    await updated.populate('user_id',     'name email avatar');
    await updated.populate('assigned_to', 'name email avatar');
    await updated.populate('teamId',      'name categories');

    const result = updated.toObject();
    if (req.user.role === 'user') delete result.internal_notes;

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Add Internal Note ─────────────────────────────────────
const addInternalNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Note text is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.internal_notes.push({ text: sanitizeText(text), author: req.user._id });
    await ticket.save();
    await ticket.populate('internal_notes.author', 'name email role');

    res.json({ message: 'Internal note added', note: ticket.internal_notes.at(-1) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Delete Ticket ─────────────────────────────────────────
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.user.role === 'user' && ticket.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await ticket.deleteOne();
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Dashboard Stats ───────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const baseQuery = {};

    const [total, open, inProgress, closed, high, medium, low, urgent, declined] = await Promise.all([
      Ticket.countDocuments(baseQuery),
      Ticket.countDocuments({ ...baseQuery, status: 'open', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ ...baseQuery, status: 'in-progress', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ ...baseQuery, status: 'closed', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ ...baseQuery, priority: 'high', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ ...baseQuery, priority: 'medium', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ ...baseQuery, priority: 'low', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ ...baseQuery, priority: 'urgent', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ ...baseQuery, approvalStatus: 'rejected' }),
    ]);

    res.json({ total, open, inProgress, closed, high, medium, low, urgent, declined });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── My Stats ─────────────────────────────────────────────
const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, open, inProgress, closed, declined] = await Promise.all([
      Ticket.countDocuments({ user_id: userId }),
      Ticket.countDocuments({ user_id: userId, status: 'open', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ user_id: userId, status: 'in-progress', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ user_id: userId, status: 'closed', approvalStatus: { $ne: 'rejected' } }),
      Ticket.countDocuments({ user_id: userId, approvalStatus: 'rejected' }),
    ]);
    res.json({ total, open, inProgress, closed, declined });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Growth Data (Chart) ───────────────────────────────────
const getGrowthData = async (req, res) => {
  try {
    const days  = 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const baseQuery = {};

    const data = await Ticket.aggregate([
      { $match: { ...baseQuery, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data.map((d) => ({ date: d._id, count: d.count })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Status Breakdown (Chart) ──────────────────────────────
const getStatusBreakdown = async (req, res) => {
  try {
    const data = await Ticket.aggregate([
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$approvalStatus', 'rejected'] },
              then: 'declined',
              else: '$status'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(data.map((d) => ({ status: d._id, count: d.count })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin Workload (Chart) ────────────────────────────────
const getAdminWorkload = async (req, res) => {
  try {
    const data = await Ticket.aggregate([
      { $match: { status: { $in: ['open', 'in-progress'] }, assigned_to: { $ne: null } } },
      { $group: { _id: '$assigned_to', count: { $sum: 1 } } },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'admin',
        },
      },
      { $unwind: '$admin' },
      {
        $project: {
          adminName: '$admin.name',
          count:     1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(data.map((d) => ({ admin: d.adminName, count: d.count })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Assign Ticket to Team (Admin/Super Admin only) ─────────
const assignTeam = async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — admins and super admins only' });
    }

    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' });
    }

    const [ticket, team] = await Promise.all([
      Ticket.findById(req.params.id),
      Team.findById(teamId).populate('teamAdmin')
    ]);

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!team)   return res.status(404).json({ message: 'Team not found' });

    const previousTeamId = ticket.teamId;
    let oldTeamName = 'Unassigned';
    if (previousTeamId) {
      const oldTeam = await Team.findById(previousTeamId);
      if (oldTeam) oldTeamName = oldTeam.name;
    }

    ticket.teamId = teamId;
    ticket.lastAdminId = req.user._id;
    const now = new Date();
    ticket.allocatedAt = now;
    ticket.autoAllocated = false;
    ticket.allocationStatus = 'allocated_team_admin';
    ticket.teamAdminViewedAt = null;
    ticket.teamAdminAllocatedAt = now;

    // Update time tracking
    ticket.timeTracking.allocatedAt = now;
    ticket.timeTracking.timeToAllocate = now - ticket.createdAt;

    await ticket.save();

    // Write lifecycle logs
    const logAction = previousTeamId ? 'TICKET_REALLOCATED_TEAM' : 'TICKET_MANUALLY_ALLOCATED_TEAM';
    await createLog({
      ticketId: ticket._id,
      action: logAction,
      performedBy: req.user,
      metadata: {
        teamId: team._id,
        teamName: team.name,
        previousValue: oldTeamName,
        newValue: team.name,
      }
    });

    // Log the assignment action
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'TICKET_ASSIGNED',
      ticketId: ticket._id,
      teamId: teamId,
      adminId: req.user._id,
      note: `Assigned to team: ${team.name} by admin: ${req.user.name}`
    });

    // Flow 3 — Admin Allocates Ticket to Team → Notify Team Admin
    if (team.teamAdmin) {
      await notify({
        recipientIds: [team.teamAdmin._id],
        senderId:     req.user._id,
        senderName:   req.user.name,
        senderRole:   'admin',
        type:         'TICKET_ALLOCATED_TO_TEAM',
        ticketId:     ticket._id,
        ticketTitle:  ticket.title,
        message:      `Ticket "${ticket.title}" has been assigned to your team (${team.name}).`
      });
    }

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user_id',                   'name email avatar')
      .populate('assigned_to',               'name email avatar')
      .populate('assignedToUser',            'name email avatar')
      .populate('internal_notes.author',     'name email role')
      .populate('teamId',                    'name categories');

    res.json({ message: 'Ticket successfully assigned to team', ticket: populatedTicket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update Ticket Status ──────────────────────────────────
const updateStatus = async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — admins and super admins only' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const prevStatus = ticket.status;
    ticket.status = status;
    ticket.status_history.push({
      from: prevStatus,
      to: status,
      changedBy: req.user._id,
      changedAt: new Date()
    });

    await ticket.save();

    const ActivityLog = require('../models/ActivityLog');
    if (status === 'closed') {
      await ActivityLog.create({
        action: 'TICKET_CLOSED',
        ticketId: ticket._id,
        adminId: req.user._id,
        note: `Ticket closed by admin: ${req.user.name}`
      });
      const ticketCreator = await User.findById(ticket.user_id);
      if (ticketCreator) {
        await notify({
          recipientIds: [ticketCreator._id],
          senderId:     req.user._id,
          senderName:   req.user.name,
          senderRole:   req.user.role === 'super-admin' ? 'super_admin' : 'admin',
          type:         'TICKET_RESOLVED',
          ticketId:     ticket._id,
          ticketTitle:  ticket.title,
          message:      `Your ticket "${ticket.title}" has been resolved and closed.`
        });
      }
    } else {
      await ActivityLog.create({
        action: 'STATUS_UPDATED',
        ticketId: ticket._id,
        adminId: req.user._id,
        note: `Status updated from "${prevStatus}" to "${status}" by admin: ${req.user.name}`
      });
    }

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar')
      .populate('assigned_to', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket status successfully updated', ticket: populatedTicket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update Ticket Priority ────────────────────────────────
const updatePriority = async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — admins and super admins only' });
    }

    const { priority } = req.body;
    if (!priority) {
      return res.status(400).json({ message: 'Priority is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const prevPriority = ticket.priority;
    ticket.priority = priority;
    await ticket.save();

    await createLog({
      ticketId: ticket._id,
      action: 'PRIORITY_CHANGED',
      performedBy: req.user,
      metadata: {
        previousValue: prevPriority,
        newValue: priority,
      }
    });

    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'STATUS_UPDATED',
      ticketId: ticket._id,
      adminId: req.user._id,
      note: `Priority updated from "${prevPriority}" to "${priority}" by admin: ${req.user.name}`
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar')
      .populate('assigned_to', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket priority successfully updated', ticket: populatedTicket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Update Ticket Due Date ────────────────────────────────
const updateDueDate = async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — admins and super admins only' });
    }

    const { dueDate } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const prevDueDate = ticket.dueDate;
    ticket.dueDate = dueDate || null;
    await ticket.save();

    const logAction = prevDueDate ? 'DUE_DATE_UPDATED' : 'DUE_DATE_SET';
    await createLog({
      ticketId: ticket._id,
      action: logAction,
      performedBy: req.user,
      metadata: {
        previousValue: prevDueDate ? new Date(prevDueDate).toLocaleDateString() : null,
        newValue: dueDate ? new Date(dueDate).toLocaleDateString() : null,
      }
    });

    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'STATUS_UPDATED',
      ticketId: ticket._id,
      adminId: req.user._id,
      note: `Due Date updated from "${prevDueDate || 'none'}" to "${dueDate || 'none'}" by admin: ${req.user.name}`
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar')
      .populate('assigned_to', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket due date successfully updated', ticket: populatedTicket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Assign Member (Team Admin only) ───────────────────────
const assignMember = async (req, res) => {
  try {
    if (req.user.role !== 'team_admin') {
      return res.status(403).json({ message: 'Access denied — Team Admins only' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'Member User ID is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Validate that this Team Admin governs the team assigned to this ticket
    const team = await Team.findOne({ teamAdmin: req.user._id });
    if (!team || ticket.teamId?.toString() !== team._id.toString()) {
      return res.status(403).json({ message: 'Access denied — this ticket is not assigned to your team' });
    }

    // Validate that the user is a member of this team
    if (!team.members.includes(userId)) {
      return res.status(400).json({ message: 'Selected user is not a member of your team' });
    }

    const memberUser = await User.findById(userId);
    if (!memberUser || memberUser.role !== 'team_user') {
      return res.status(400).json({ message: 'Selected user is not a valid Team User' });
    }

    const previousAssignedUser = ticket.assignedToUser;
    let previousUserName = null;
    if (previousAssignedUser) {
      const prevUser = await User.findById(previousAssignedUser);
      if (prevUser) previousUserName = prevUser.name;
    }

    ticket.assignedToUser = userId;
    ticket.allocationStatus = 'allocated_team_user';
    ticket.teamUserAllocatedAt = new Date();

    // Set status to in-progress when allocated to Team User
    const prevStatus = ticket.status;
    ticket.status = 'in-progress';
    ticket.status_history.push({
      from: prevStatus,
      to: 'in-progress',
      changedBy: req.user._id,
      changedAt: new Date()
    });

    const now = new Date();
    // Update time tracking
    ticket.timeTracking.memberAssignedAt = now;
    ticket.timeTracking.inProgressAt = now;
    if (ticket.timeTracking.allocatedAt) {
      ticket.timeTracking.timeToAssign = now - ticket.timeTracking.allocatedAt;
    }

    await ticket.save();

    // Write lifecycle logs
    await createLog({
      ticketId: ticket._id,
      action: 'ALLOCATED_TO_TEAM_USER_BY_TEAM_ADMIN',
      performedBy: req.user,
      metadata: {
        assignedToUserId: memberUser._id,
        assignedToUserName: memberUser.name,
        teamId: team._id,
        teamName: team.name,
        previousValue: previousUserName,
        note: `Team Admin allocated ticket to team user: ${memberUser.name}`,
      }
    });

    const logAction = previousAssignedUser ? 'TICKET_REASSIGNED_TO_MEMBER' : 'TICKET_ASSIGNED_TO_MEMBER';
    await createLog({
      ticketId: ticket._id,
      action: logAction,
      performedBy: req.user,
      metadata: {
        assignedToUserId: memberUser._id,
        assignedToUserName: memberUser.name,
        teamId: team._id,
        teamName: team.name,
        previousValue: previousUserName,
        note: 'Ticket assigned to team member',
      }
    });

    await createLog({
      ticketId: ticket._id,
      action: 'TICKET_IN_PROGRESS',
      performedBy: { _id: '000000000000000000000000', name: 'System', email: 'system@tealvue.com', role: 'system' },
      metadata: {
        assignedToUserName: memberUser.name,
        note: 'Status changed to in-progress after team member assigned',
      }
    });

    // Log Action
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'TICKET_ASSIGNED',
      ticketId: ticket._id,
      userId: userId,
      adminId: req.user._id,
      note: `Allocated to member "${memberUser.name}" by Team Admin: ${req.user.name}. Status set to "in-progress"`
    });

    // Flow 5 — Team Admin Allocates to Team User → Notify Team User
    await notify({
      recipientIds: [memberUser._id],
      senderId:     req.user._id,
      senderName:   req.user.name,
      senderRole:   'team_admin',
      type:         'TICKET_ALLOCATED_TO_TEAM_USER',
      ticketId:     ticket._id,
      ticketTitle:  ticket.title,
      message:      `Ticket "${ticket.title}" has been assigned to you.`
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar')
      .populate('assignedToUser', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket successfully allocated to team member', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Close Ticket (Team User only) ─────────────────────────
const closeTicket = async (req, res) => {
  try {
    if (req.user.role !== 'team_user') {
      return res.status(403).json({ message: 'Access denied — Team Users only' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Validate that this ticket is assigned to this team_user
    if (ticket.assignedToUser?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied — you are not assigned to this ticket' });
    }

    // Only allow closing if it is in-progress
    if (ticket.status !== 'in-progress') {
      return res.status(400).json({ message: 'You can only close tickets that are currently in-progress' });
    }

    const { note } = req.body;
    const prevStatus = ticket.status;
    ticket.status = 'closed';
    ticket.status_history.push({
      from: prevStatus,
      to: 'closed',
      changedBy: req.user._id,
      changedAt: new Date()
    });

    const now = new Date();
    // Update time tracking
    ticket.timeTracking.closedAt = now;
    ticket.timeTracking.timeToClose = now - ticket.createdAt;
    if (ticket.timeTracking.inProgressAt) {
      ticket.timeTracking.timeInProgress = now - ticket.timeTracking.inProgressAt;
    }

    await ticket.save();

    await createLog({
      ticketId: ticket._id,
      action: 'TICKET_CLOSED_BY_TEAM_USER',
      performedBy: req.user,
      metadata: {
        previousValue: prevStatus,
        newValue: 'closed',
        note: note || 'Ticket closed by agent',
      }
    });

    // Log Action
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'TICKET_CLOSED',
      ticketId: ticket._id,
      userId: req.user._id,
      note: `Ticket resolved and closed by Team User: ${req.user.name}`
    });

    // Flow 7 — Team User Closes Ticket → Notify User + Team Admin + Admin
    const team = await Team.findById(ticket.teamId).populate('teamAdmin');
    const recipientIds = [ticket.user_id._id || ticket.user_id];
    if (team && team.teamAdmin) {
      recipientIds.push(team.teamAdmin._id);
    }
    if (ticket.lastAdminId) {
      recipientIds.push(ticket.lastAdminId);
    }

    await notify({
      recipientIds,
      senderId:     req.user._id,
      senderName:   req.user.name,
      senderRole:   'team_user',
      type:         'TICKET_RESOLVED',
      ticketId:     ticket._id,
      ticketTitle:  ticket.title,
      message:      `Your ticket "${ticket.title}" has been resolved and closed.`
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar')
      .populate('assignedToUser', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket resolved and closed successfully', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Content Moderation (Super Admin) ──────────────────────
const getAllTicketsAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: 'Access denied — super admins only' });
    }
    const tickets = await Ticket.find()
      .populate('user_id', 'name email avatar createdAt role')
      .populate('assigned_to', 'name email avatar')
      .populate('assignedToUser', 'name email avatar')
      .populate('teamId', 'name categories')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const suspendTicket = async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: 'Access denied — super admins only' });
    }
    const { moderationNote } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.approvalStatus = 'suspended';
    ticket.moderatedBy = req.user._id;
    ticket.moderatedAt = new Date();
    await ticket.save();

    await createLog({
      ticketId: ticket._id,
      action: 'TICKET_SUSPENDED',
      performedBy: req.user,
      metadata: {
        note: moderationNote || 'Suspended for review'
      }
    });

    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'TICKET_SUSPENDED',
      ticketId: ticket._id,
      userId: req.user._id,
      note: moderationNote || 'Suspended for review'
    });

    // Removed email and notification stubs - no-ops for this step

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar createdAt role')
      .populate('assigned_to', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket suspended successfully', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const rejectTicket = async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: 'Access denied — super admins only' });
    }
    const { moderationNote } = req.body;
    if (!moderationNote || moderationNote.length < 10) {
      return res.status(400).json({ message: 'Moderation note is required (minimum 10 characters)' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.approvalStatus = 'rejected';
    ticket.moderatedBy = req.user._id;
    ticket.moderatedAt = new Date();
    ticket.moderationNote = moderationNote;
    await ticket.save();

    await createLog({
      ticketId: ticket._id,
      action: 'TICKET_REJECTED',
      performedBy: req.user,
      metadata: {
        note: moderationNote
      }
    });

    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'TICKET_REJECTED',
      ticketId: ticket._id,
      userId: req.user._id,
      note: moderationNote
    });

    // Removed email and notification stubs - no-ops for this step

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar createdAt role')
      .populate('assigned_to', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket rejected successfully', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const restoreTicket = async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — admins and super admins only' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.approvalStatus = 'approved';
    ticket.moderatedBy = req.user._id;
    ticket.moderatedAt = new Date();
    ticket.moderationNote = 'Restored';
    await ticket.save();

    await createLog({
      ticketId: ticket._id,
      action: 'TICKET_RESTORED',
      performedBy: req.user,
      metadata: {
        note: 'Restored'
      }
    });

    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      action: 'TICKET_RESTORED',
      ticketId: ticket._id,
      userId: req.user._id
    });

    // Auto-allocate if teamId is still null
    if (!ticket.teamId) {
      const mapCategory = (cat) => {
        if (!cat) return 'General';
        const c = cat.toLowerCase();
        if (c === 'technical') return 'Technical';
        if (c === 'billing') return 'Billing';
        if (c === 'general') return 'General';
        if (c === 'hr') return 'HR';
        return 'Other';
      };

      const targetCategory = mapCategory(ticket.category);
      const team = await Team.findOne({
        categories: targetCategory,
        isActive: true
      });
      if (team) {
        ticket.teamId = team._id;
        ticket.allocatedAt = new Date();
        ticket.autoAllocated = true;
        await ticket.save();

        await ActivityLog.create({
          action: 'AUTO_ALLOCATED',
          ticketId: ticket._id,
          teamId: team._id,
          note: `Auto-allocated on restore — category: ${ticket.category} -> ${targetCategory}`
        });
      }
    }

    // Removed email and notification stubs - no-ops for this step

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar createdAt role')
      .populate('assigned_to', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket restored successfully', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const bulkModerateTickets = async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: 'Access denied — super admins only' });
    }
    const { ids, action, moderationNote } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'List of ticket IDs is required' });
    }
    if (!['suspend', 'reject', 'restore'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action specified' });
    }
    if (action === 'reject' && (!moderationNote || moderationNote.length < 10)) {
      return res.status(400).json({ message: 'Moderation note is required for rejection (min 10 chars)' });
    }

    const approvalStatus = action === 'suspend' ? 'suspended' : action === 'reject' ? 'rejected' : 'approved';
    const noteText = action === 'restore' ? 'Restored' : (moderationNote || '');

    const tickets = await Ticket.find({ _id: { $in: ids } });
    const ActivityLog = require('../models/ActivityLog');
    const Notification = require('../models/Notification');

    for (const ticket of tickets) {
      ticket.approvalStatus = approvalStatus;
      ticket.moderatedBy = req.user._id;
      ticket.moderatedAt = new Date();
      ticket.moderationNote = noteText;
      await ticket.save();

      const actionType = action === 'suspend' ? 'TICKET_SUSPENDED' : action === 'reject' ? 'TICKET_REJECTED' : 'TICKET_RESTORED';
      await ActivityLog.create({
        action: actionType,
        ticketId: ticket._id,
        userId: req.user._id,
        note: noteText
      });

      // Removed email and notification stubs - no-ops for this step

      if (action === 'restore' && !ticket.teamId) {
        const mapCategory = (cat) => {
          if (!cat) return 'General';
          const c = cat.toLowerCase();
          if (c === 'technical') return 'Technical';
          if (c === 'billing') return 'Billing';
          if (c === 'general') return 'General';
          if (c === 'hr') return 'HR';
          return 'Other';
        };

        const targetCategory = mapCategory(ticket.category);
        const team = await Team.findOne({
          categories: targetCategory,
          isActive: true
        });
        if (team) {
          ticket.teamId = team._id;
          ticket.allocatedAt = new Date();
          ticket.autoAllocated = true;
          await ticket.save();

          await ActivityLog.create({
            action: 'AUTO_ALLOCATED',
            ticketId: ticket._id,
            teamId: team._id,
            note: `Auto-allocated on bulk restore — category: ${ticket.category} -> ${targetCategory}`
          });
        }
      }
    }

    res.json({ message: `Bulk action ${action} completed successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET Ticket Logs (Filtered based on roles) ────────────────
const getTicketLogs = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Authorization & Access Control Check
    if (req.user.role === 'user') {
      if (ticket.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'team_admin') {
      const team = await Team.findOne({ teamAdmin: req.user._id });
      if (!team || ticket.teamId?.toString() !== team._id.toString()) {
        return res.status(403).json({ message: 'Access denied — own team tickets only' });
      }
    } else if (req.user.role === 'team_user') {
      if (ticket.assignedToUser?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied — assigned tickets only' });
      }
    }

    // Fetch logs
    const TicketLog = require('../models/TicketLog');
    const logs = await TicketLog.find({ ticketId }).sort({ timestamp: 1 });

    // Filter logs for standard users
    if (req.user.role === 'user') {
      const excludedActions = [
        'PRIORITY_CHANGED',
        'DUE_DATE_SET',
        'DUE_DATE_UPDATED',
        'TICKET_ASSIGNED_TO_MEMBER',
        'TICKET_REASSIGNED_TO_MEMBER'
      ];
      let filteredLogs = logs.filter(log => !excludedActions.includes(log.action));
      
      // Simplify auto-allocation logs for standard users (show only states)
      filteredLogs = filteredLogs.map(log => {
        const logObj = log.toObject ? log.toObject() : log;
        if (logObj.metadata) {
          if (
            logObj.action === 'TICKET_AUTO_ALLOCATED_TEAM' ||
            logObj.action === 'AUTO_ALLOCATED' ||
            logObj.action === 'AUTO_ALLOCATED_TEAM_ADMIN' ||
            logObj.action === 'AUTO_ALLOCATED_TO_ADMIN_NO_CATEGORY' ||
            (logObj.metadata.note && logObj.metadata.note.includes('Admin auto'))
          ) {
            logObj.metadata.note = 'admin auto allocketed to the team';
          }
          if (
            logObj.action === 'TICKET_ASSIGNED_TO_MEMBER' ||
            logObj.action === 'TICKET_ASSIGNED' ||
            logObj.action === 'AUTO_ALLOCATED_TEAM_USER_AFTER_TIMEOUT' ||
            logObj.action === 'ALLOCATED_TO_TEAM_USER_BY_TEAM_ADMIN' ||
            (logObj.metadata.note && logObj.metadata.note.includes('Team Admin auto')) ||
            (logObj.metadata.note && logObj.metadata.note.includes('Auto-allocated to agent'))
          ) {
            logObj.metadata.note = 'team admin auto allocketed to team users';
          }
        }
        return logObj;
      });
      return res.json(filteredLogs);
    }

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET Ticket Time Summary ──────────────────────────────────
const getTicketTimeSummary = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Authorize: admin, super-admin, ticket creator, assigned agent, or the team's admin
    let hasAccess = false;
    if (['admin', 'super-admin'].includes(req.user.role)) {
      hasAccess = true;
    } else if (ticket.user_id?.toString() === req.user._id.toString()) {
      hasAccess = true;
    } else if (ticket.assignedToUser?.toString() === req.user._id.toString()) {
      hasAccess = true;
    } else if (ticket.teamId) {
      const team = await Team.findById(ticket.teamId);
      if (team && team.teamAdmin?.toString() === req.user._id.toString()) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied — unauthorized to view time summary' });
    }

    const { formatDuration } = require('../utils/timeFormat');
    const tracking = ticket.timeTracking || {};

    res.json({
      timeTracking: tracking,
      formatted: {
        timeToAllocate: formatDuration(tracking.timeToAllocate),
        timeToAssign: formatDuration(tracking.timeToAssign),
        timeToClose: formatDuration(tracking.timeToClose),
        timeInProgress: formatDuration(tracking.timeInProgress),
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET All Ticket Logs (Admin/Super Admin only) ─────────────
const getAllTicketLogs = async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — Admins and Super Admins only' });
    }
    const TicketLog = require('../models/TicketLog');
    const logs = await TicketLog.find()
      .populate('ticketId', 'title')
      .sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT Set Category (Admin/Super Admin only) ────────────────
const setCategory = async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — admins and super admins only' });
    }
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.category = category;
    ticket.categorySelectedByUser = true;
    
    const team = await Team.findOne({ categories: category, isActive: true });
    if (team) {
      ticket.teamId = team._id;
      ticket.allocationStatus = 'allocated_team_admin';
      ticket.autoAllocatedAt = new Date();
      ticket.teamAdminAllocatedAt = new Date();
      ticket.teamAdminViewedAt = null;
    } else {
      ticket.allocationStatus = 'pending_admin';
    }

    await ticket.save();

    await createLog({
      ticketId: ticket._id,
      action: 'CATEGORY_SET_BY_ADMIN',
      performedBy: req.user,
      metadata: {
        newValue: category,
        note: `Admin set category to: ${category}`
      }
    });

    if (team) {
      await createLog({
        ticketId: ticket._id,
        action: 'AUTO_ALLOCATED_TEAM_ADMIN',
        performedBy: { _id: '000000000000000000000000', name: 'System', email: 'system@tealvue.com', role: 'system' },
        metadata: {
          teamId: team._id,
          teamName: team.name,
          note: `Admin auto allocated to the team: ${team.name} based on category: ${category}`
        }
      });

      if (team.teamAdmin) {
        await notify({
          recipientIds: [team.teamAdmin],
          senderId:     req.user._id,
          senderName:   req.user.name,
          senderRole:   req.user.role,
          type:         'TICKET_CREATED',
          ticketId:     ticket._id,
          ticketTitle:  ticket.title,
          message:      `New ticket auto-allocated to your team: "${ticket.title}"`
        });
      }
    }

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar')
      .populate('assignedToUser', 'name email avatar')
      .populate('teamId', 'name categories description teamAdmin');

    res.json({ message: 'Category set and ticket allocated successfully', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT Decline Ticket (Admin/Super Admin only) ─────────────
const declineTicket = async (req, res) => {
  try {
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — admins and super admins only' });
    }
    const { reason } = req.body;
    if (!reason || reason.length < 5) {
      return res.status(400).json({ message: 'Decline reason is required (minimum 5 characters)' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.allocationStatus = 'declined';
    ticket.approvalStatus = 'rejected';
    ticket.moderationNote = reason;
    await ticket.save();

    await createLog({
      ticketId: ticket._id,
      action: 'TICKET_DECLINED_BY_ADMIN',
      performedBy: req.user,
      metadata: {
        note: reason
      }
    });

    await notify({
      recipientIds: [ticket.user_id],
      senderId:     req.user._id,
      senderName:   req.user.name,
      senderRole:   req.user.role,
      type:         'TICKET_REJECTED',
      ticketId:     ticket._id,
      ticketTitle:  ticket.title,
      message:      `Your ticket "${ticket.title}" was declined: "${reason}"`
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar')
      .populate('assignedToUser', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket successfully declined', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT Reallocate Ticket (Team Admin/User only) ────────────
const reallocateTicket = async (req, res) => {
  try {
    if (!['team_admin', 'team_user'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — Team Admin or Team User only' });
    }
    const { newCategory, reason } = req.body;
    if (!newCategory || !reason) {
      return res.status(400).json({ message: 'New category and reallocation reason are required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const newTeam = await Team.findOne({ categories: newCategory, isActive: true });
    if (!newTeam) {
      return res.status(400).json({ message: `No active team found for category: ${newCategory}` });
    }

    if (ticket.teamId && ticket.teamId.toString() === newTeam._id.toString()) {
      return res.status(400).json({ message: `Cannot reallocate ticket to your own team/category: ${newCategory}` });
    }

    const oldTeamId = ticket.teamId;
    ticket.reallocatedFromTeamId = oldTeamId;
    ticket.teamId = newTeam._id;
    ticket.category = newCategory;
    ticket.allocationStatus = 'reallocated_team';
    ticket.reallocatedByRole = req.user.role;
    ticket.teamAdminViewedAt = null;
    ticket.autoAllocatedAt = new Date();
    ticket.teamAdminAllocatedAt = new Date();
    ticket.assignedToUser = null;
    ticket.status = 'open';

    await ticket.save();

    const action = req.user.role === 'team_admin'
      ? 'REALLOCATED_TO_OTHER_TEAM_BY_TEAM_ADMIN'
      : 'REALLOCATED_TO_OTHER_TEAM_BY_TEAM_USER';

    await createLog({
      ticketId: ticket._id,
      action,
      performedBy: req.user,
      metadata: {
        teamId: newTeam._id,
        teamName: newTeam.name,
        note: `Reallocated from old team to ${newTeam.name} due to category mismatch. Reason: ${reason}`
      }
    });

    const oldTeam = await Team.findById(oldTeamId);
    const systemAdmins = await User.find({ role: 'admin' }).select('_id');
    
    const recipientIds = [];
    if (newTeam.teamAdmin) recipientIds.push(newTeam.teamAdmin);
    if (oldTeam && oldTeam.teamAdmin) recipientIds.push(oldTeam.teamAdmin);
    systemAdmins.forEach(admin => recipientIds.push(admin._id));

    await notify({
      recipientIds,
      senderId:     req.user._id,
      senderName:   req.user.name,
      senderRole:   req.user.role,
      type:         'TICKET_REALLOCATED_TEAM',
      ticketId:     ticket._id,
      ticketTitle:  ticket.title,
      message:      `Ticket "${ticket.title}" reallocated to team: ${newTeam.name}. Reason: ${reason}`
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar')
      .populate('assignedToUser', 'name email avatar')
      .populate('teamId', 'name categories description teamAdmin');

    res.json({ message: 'Ticket successfully reallocated', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT Transfer to Admin (Team Admin/User only) ─────────────
const transferToAdmin = async (req, res) => {
  try {
    if (!['team_admin', 'team_user'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied — Team Admin or Team User only' });
    }
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Transfer reason is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.allocationStatus = 'transferred_to_admin';
    ticket.transferredToAdminAt = new Date();
    ticket.transferredToAdminReason = reason;
    ticket.assignedToUser = null;

    await ticket.save();

    const action = req.user.role === 'team_admin'
      ? 'TRANSFERRED_TO_ADMIN_BY_TEAM_ADMIN'
      : 'TRANSFERRED_TO_ADMIN_BY_TEAM_USER';

    await createLog({
      ticketId: ticket._id,
      action,
      performedBy: req.user,
      metadata: {
        note: reason
      }
    });

    const admins = await User.find({ role: 'admin' }).select('_id');
    const adminIds = admins.map(a => a._id);

    await notify({
      recipientIds: adminIds,
      senderId:     req.user._id,
      senderName:   req.user.name,
      senderRole:   req.user.role,
      type:         'TICKET_CREATED',
      ticketId:     ticket._id,
      ticketTitle:  ticket.title,
      message:      `Ticket "${ticket.title}" transferred back to admin by ${req.user.name}. Reason: ${reason}`
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('user_id', 'name email avatar')
      .populate('assignedToUser', 'name email avatar')
      .populate('teamId', 'name categories');

    res.json({ message: 'Ticket transferred to admin successfully', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addInternalNote,
  deleteTicket,
  getStats,
  getMyStats,
  getGrowthData,
  getStatusBreakdown,
  getAdminWorkload,
  assignTeam,
  updateStatus,
  updatePriority,
  updateDueDate,
  assignMember,
  closeTicket,
  getAllTicketsAdmin,
  suspendTicket,
  rejectTicket,
  restoreTicket,
  bulkModerateTickets,
  getTicketLogs,
  getTicketTimeSummary,
  getAllTicketLogs,
  setCategory,
  declineTicket,
  reallocateTicket,
  transferToAdmin,
};
