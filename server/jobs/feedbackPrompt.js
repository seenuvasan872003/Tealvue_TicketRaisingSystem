// ============================================================
//  server/jobs/feedbackPrompt.js  —  Feedback Prompt Cron Job
// ============================================================
//  Runs every minute. After 10 minutes from ticket close,
//  sends a FEEDBACK_PROMPT notification to the ticket creator.
// ============================================================

const cron         = require('node-cron');
const Ticket       = require('../models/Ticket');
const Notification = require('../models/Notification');

const startFeedbackPromptJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const tickets = await Ticket.find({
        status:         'closed',
        feedbackStatus: 'pending',
        closedAt:       { $lte: tenMinutesAgo }
      });

      if (tickets.length > 0) {
        console.log(`[CRON][FEEDBACK] Found ${tickets.length} ticket(s) ready for feedback prompt.`);
      }

      for (const ticket of tickets) {
        try {
          await Notification.create({
            recipientId:  ticket.user_id,
            senderId:     ticket.assignedToUser || ticket.user_id,
            senderName:   'Tealvue',
            senderRole:   'system',
            type:         'FEEDBACK_PROMPT',
            ticketId:     ticket._id,
            ticketTitle:  ticket.title,
            message:      `Your ticket "${ticket.title}" was resolved. Please share your feedback.`
          });

          ticket.feedbackStatus  = 'sent';
          ticket.feedbackPromptAt = new Date();
          await ticket.save();

          console.log(`[CRON][FEEDBACK] Prompt sent for ticket: ${ticket._id}`);
        } catch (innerErr) {
          console.error(`[CRON][FEEDBACK] Error processing ticket ${ticket._id}:`, innerErr.message);
        }
      }
    } catch (err) {
      console.error('[CRON][FEEDBACK] Job error:', err.message);
    }
  });

  console.log('[CRON] Feedback prompt job started.');
};

module.exports = { startFeedbackPromptJob };
