// ============================================================
//  server/utils/notify.js  —  Notify Utility Helper
// ============================================================

const Notification = require('../models/Notification');

/**
 * Creates notifications for one or many recipients in a single DB call.
 */
const notify = async ({
  recipientIds,
  senderId,
  senderName,
  senderRole,
  type,
  ticketId,
  ticketTitle,
  message
}) => {
  // Normalize to array of IDs
  const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
  
  // Filter out any null/undefined IDs
  const validIds = ids.filter(id => id);
  if (validIds.length === 0) return;

  const notifications = validIds.map(recipientId => ({
    recipientId,
    senderId,
    senderName,
    senderRole,
    type,
    ticketId,
    ticketTitle,
    message
  }));

  await Notification.insertMany(notifications);
};

module.exports = { notify };
