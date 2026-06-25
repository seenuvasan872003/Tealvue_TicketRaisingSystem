const Comment = require('../models/Comment');
const Ticket = require('../models/Ticket');
const createLog = require('../utils/createLog');

const isAdminLevel = (user) => user.role === 'admin' || user.role === 'super-admin';

// Helper to check if a user has access to a ticket
const hasTicketAccess = async (user, ticket) => {
  if (user.role === 'admin' || user.role === 'super-admin') return true;
  if (ticket.user_id.toString() === user._id.toString()) return true;
  
  if (user.role === 'team_admin') {
    const Team = require('../models/Team');
    const team = await Team.findOne({ teamAdmin: user._id });
    if (team && ticket.teamId && ticket.teamId.toString() === team._id.toString()) {
      return true;
    }
  }
  
  if (user.role === 'team_user') {
    if (ticket.assignedToUser && ticket.assignedToUser.toString() === user._id.toString()) {
      return true;
    }
  }
  
  return false;
};

// @desc  Get comments for a ticket
// @route GET /api/comments/:ticketId
// @access Private
const getCommentsByTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const hasAccess = await hasTicketAccess(req.user, ticket);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comments = await Comment.find({ ticket_id: req.params.ticketId })
      .populate('user_id', 'name email role avatar')
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Add comment to ticket
// @route POST /api/comments
// @access Private
const addComment = async (req, res) => {
  try {
    const { ticket_id, comment } = req.body;

    if (!ticket_id || !comment) {
      return res.status(400).json({ message: 'ticket_id and comment are required' });
    }

    const ticket = await Ticket.findById(ticket_id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' })

    const hasAccess = await hasTicketAccess(req.user, ticket);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newComment = await Comment.create({
      ticket_id,
      user_id: req.user._id,
      comment,
    });

    await createLog({
      ticketId: ticket_id,
      action: 'COMMENT_ADDED',
      performedBy: req.user,
      metadata: {
        note: comment.slice(0, 100),
      }
    });

    const populated = await newComment.populate('user_id', 'name email role avatar');
    
    // Dispatch real-time update to ticket room via WebSocket
    if (req.io) {
      req.io.to(ticket_id).emit('newComment', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCommentsByTicket, addComment };

