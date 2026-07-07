// ============================================================
//  server/controllers/feedbackController.js
// ============================================================

const Feedback = require('../models/Feedback');
const Ticket   = require('../models/Ticket');
const Team     = require('../models/Team');

// ── Submit feedback ───────────────────────────────────────────
const submitFeedback = async (req, res) => {
  try {
    const { ticketId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!ticketId || !rating) {
      return res.status(400).json({ message: 'ticketId and rating are required' });
    }
    if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }
    if (comment && comment.length > 300) {
      return res.status(400).json({ message: 'Comment must be 300 characters or less' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (String(ticket.user_id) !== String(userId)) {
      return res.status(403).json({ message: 'You can only submit feedback for your own tickets' });
    }
    if (ticket.status !== 'closed') {
      return res.status(400).json({ message: 'Feedback can only be submitted for closed tickets' });
    }

    const existing = await Feedback.findOne({ ticketId });
    if (existing && existing.isSubmitted) {
      ticket.feedbackStatus = 'submitted';
      await ticket.save();
      return res.status(200).json({ message: 'Feedback already submitted for this ticket', feedback: existing });
    }

    // Create or update feedback document
    const feedbackData = {
      ticketId,
      userId,
      teamId:     ticket.teamId,
      teamUserId: ticket.assignedToUser,
      rating:     Number(rating),
      comment:    comment || '',
      submittedAt: new Date(),
      isSubmitted: true,
      isDismissed: false
    };

    let feedback;
    if (existing) {
      Object.assign(existing, feedbackData);
      feedback = await existing.save();
    } else {
      feedback = await Feedback.create(feedbackData);
    }

    // Update ticket feedbackStatus
    ticket.feedbackStatus = 'submitted';
    await ticket.save();

    // Update team rating stats
    if (ticket.teamId) {
      const team = await Team.findById(ticket.teamId);
      if (team) {
        const ratingKeys = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
        const key = ratingKeys[Number(rating)];
        if (!team.ratingBreakdown) team.ratingBreakdown = { one: 0, two: 0, three: 0, four: 0, five: 0 };
        team.ratingBreakdown[key] = (team.ratingBreakdown[key] || 0) + 1;
        team.totalFeedbacks = (team.totalFeedbacks || 0) + 1;

        // Recalculate average
        const breakdown = team.ratingBreakdown;
        const totalStars =
          (breakdown.one   || 0) * 1 +
          (breakdown.two   || 0) * 2 +
          (breakdown.three || 0) * 3 +
          (breakdown.four  || 0) * 4 +
          (breakdown.five  || 0) * 5;
        team.averageRating = team.totalFeedbacks > 0
          ? Math.round((totalStars / team.totalFeedbacks) * 10) / 10
          : null;

        await team.save();
      }
    }

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    console.error('[FEEDBACK] submitFeedback error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── Get pending feedback (for user dashboard) ─────────────────
const getPendingFeedback = async (req, res) => {
  try {
    const userId = req.user._id;
    const tickets = await Ticket.find({
      user_id: userId,
      feedbackStatus: 'sent'
    }).select('_id title teamId assignedToUser closedAt feedbackStatus').lean();
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Dismiss feedback ──────────────────────────────────────────
const dismissFeedback = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user._id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (String(ticket.user_id) !== String(userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    ticket.feedbackStatus = 'dismissed';
    await ticket.save();

    // Also mark feedback doc as dismissed
    await Feedback.findOneAndUpdate(
      { ticketId },
      { isDismissed: true },
      { upsert: false }
    );

    res.json({ message: 'Feedback dismissed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get all feedback (admin) ──────────────────────────────────
const getAllFeedback = async (req, res) => {
  try {
    const { teamId, from, to, page = 1, limit = 20 } = req.query;
    const filter = { isSubmitted: true };
    if (teamId) filter.teamId = teamId;
    if (from || to) {
      filter.submittedAt = {};
      if (from) filter.submittedAt.$gte = new Date(from);
      if (to)   filter.submittedAt.$lte = new Date(to);
    }
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Feedback.countDocuments(filter);
    const feedbacks = await Feedback.find(filter)
      .populate('ticketId', 'title status')
      .populate('userId',   'name email')
      .populate('teamId',   'name')
      .populate('teamUserId', 'name email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();
    res.json({ feedbacks, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Get feedback for a specific team ─────────────────────────
const getTeamFeedback = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const filter = { teamId, isSubmitted: true };
    const skip   = (Number(page) - 1) * Number(limit);
    const total  = await Feedback.countDocuments(filter);
    const feedbacks = await Feedback.find(filter)
      .populate('ticketId', 'title')
      .populate('userId',   'name email')
      .populate('teamUserId', 'name email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const team = await Team.findById(teamId).select('name averageRating totalFeedbacks ratingBreakdown').lean();
    res.json({ feedbacks, total, page: Number(page), team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { submitFeedback, getPendingFeedback, dismissFeedback, getAllFeedback, getTeamFeedback };
