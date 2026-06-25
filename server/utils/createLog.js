// ============================================================
//  server/utils/createLog.js  —  TicketLog Creation Helper
// ============================================================

const TicketLog = require('../models/TicketLog');

/**
 * Creates a new lifecycle log entry for a ticket.
 * @param {Object} params
 * @param {string} params.ticketId - The ID of the ticket
 * @param {string} params.action - The log action enum
 * @param {Object} params.performedBy - User object performing the action (req.user or custom)
 * @param {Object} [params.metadata] - Extra metadata relevant to the action
 */
const createLog = async ({ ticketId, action, performedBy, metadata = {} }) => {
  try {
    if (!performedBy) {
      console.warn(`[TicketLog] No performer specified for action: ${action}`);
      return;
    }

    const performer = {
      userId: performedBy.userId || performedBy._id,
      name:   performedBy.name,
      email:  performedBy.email,
      role:   performedBy.role,
    };

    await TicketLog.create({
      ticketId,
      action,
      performedBy: performer,
      metadata,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error(`[TicketLog] Failed to write log for action ${action}:`, err.message);
  }
};

module.exports = createLog;
