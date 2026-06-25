// ============================================================
//  server/utils/notifyOnce.js  —  Notify Once Utility Helper
// ============================================================

const Notification = require('../models/Notification');
const { notify } = require('./notify');

/**
 * Ensures that a notification of a specific type from a sender regarding a ticket
 * is only created once. Prevents duplicates on view triggers.
 */
const notifyOnce = async ({
  senderId,
  type,
  ticketId,
  ...rest
}) => {
  const already = await Notification.findOne({ senderId, type, ticketId });
  if (already) return;
  
  await notify({ senderId, type, ticketId, ...rest });
};

module.exports = { notifyOnce };
