// ============================================================
//  server/models/Notification.js  —  Notification Schema
// ============================================================

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    senderId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    senderName: { type: String },
    senderRole: {
      type: String,
      enum: ['user', 'admin', 'super_admin', 'team_admin', 'team_user', 'system']
    },

    type: {
      type:     String,
      required: true,
      enum: [
        'TICKET_CREATED',
        'TICKET_VIEWED_BY_ADMIN',
        'TICKET_ALLOCATED_TO_TEAM',
        'TICKET_VIEWED_BY_TEAM_ADMIN',
        'TICKET_ALLOCATED_TO_TEAM_USER',
        'TICKET_VIEWED_BY_TEAM_USER',
        'TICKET_RESOLVED',
        'TICKET_REALLOCATED_TEAM',
        'TICKET_REJECTED'
      ]
    },

    ticketId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
    ticketTitle: { type: String },
    message:     { type: String, required: true },
    isRead:      { type: Boolean, default: false },
    readAt:      { type: Date, default: null },
    createdAt:   { type: Date, default: Date.now }
  }
);

// Indexes
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ ticketId: 1, senderId: 1, type: 1 });

// Post-save hook to dispatch Webhook on notification creation
notificationSchema.post('save', async function(doc) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const url = require('url');
    const http = require('http');
    const https = require('https');

    const parsedUrl = url.parse(webhookUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const payload = {
      event: 'notification.created',
      timestamp: new Date(),
      data: {
        _id: doc._id,
        recipientId: doc.recipientId,
        senderId: doc.senderId,
        senderName: doc.senderName,
        senderRole: doc.senderRole,
        type: doc.type,
        ticketId: doc.ticketId,
        ticketTitle: doc.ticketTitle,
        message: doc.message,
        isRead: doc.isRead,
        readAt: doc.readAt,
        createdAt: doc.createdAt,
      }
    };
    const dataStr = JSON.stringify(payload);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path || '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr),
      },
    };

    const req = client.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        console.log(`[WEBHOOK] Dispatched notification ${doc._id} to ${webhookUrl}. Status: ${res.statusCode}`);
      });
    });

    req.on('error', (err) => {
      console.error('[WEBHOOK ERROR] Failed to dispatch webhook:', err.message);
    });

    req.write(dataStr);
    req.end();
  } catch (err) {
    console.error('[WEBHOOK ERROR] Failed to dispatch webhook:', err.message);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
