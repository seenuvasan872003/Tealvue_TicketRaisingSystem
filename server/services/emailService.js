// ============================================================
//  server/services/emailService.js  —  Nodemailer Email Sender
// ============================================================
//  REQUIRES ENV:
//    EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
//
//  FUNCTIONS:
//    sendTicketClosedEmail(user, ticket)   — notify ticket creator on close
//    sendTicketAssignedEmail(admin, ticket)— notify admin on assignment
//    sendAccountApprovedEmail(user)        — notify user/admin on approval
// ============================================================

const nodemailer = require('nodemailer');

// Build transporter — only if credentials are configured
const createTransport = () => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
    return null; // Email not configured — skip silently
  }
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ── Send helper ───────────────────────────────────────────
const send = async (to, subject, html) => {
  const targetEmail = 'email@gmail.com';
  console.log(`[EMAIL] Stopped (actual sending disabled) | Subject: "${subject}" | Original Recipient: <${to}> | Rerouted To: <${targetEmail}>`);
  return;
};

// ── Email Templates ───────────────────────────────────────
const baseStyle = `
  font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  background: #0d1117; color: #f0f6fc; padding: 32px;
  max-width: 600px; margin: 0 auto; border-radius: 12px;
`;
const tealStyle = `color: #14A07D; font-weight: 700;`;
const cardStyle = `
  background: #1c2128; border: 1px solid #30363d; border-radius: 10px;
  padding: 20px 24px; margin: 20px 0;
`;

// @desc  Notify ticket creator when ticket is closed
const sendTicketClosedEmail = async (user, ticket) => {
  const subject = `Your ticket "${ticket.title}" has been closed — Tealvue`;
  const html = `
    <div style="${baseStyle}">
      <h1 style="${tealStyle}">Tealvue</h1>
      <h2>Ticket Closed</h2>
      <p>Hi ${user.name},</p>
      <p>Your support ticket has been resolved and closed.</p>
      <div style="${cardStyle}">
        <p><strong>Ticket:</strong> ${ticket.title}</p>
        <p><strong>ID:</strong> #${ticket._id.toString().slice(-6).toUpperCase()}</p>
        <p><strong>Status:</strong> <span style="${tealStyle}">Closed</span></p>
      </div>
      <p>If you have further questions, please open a new ticket.</p>
      <p style="color: #8b949e; font-size: 12px;">Tealvue Support Team</p>
    </div>
  `;
  await send(user.email, subject, html);
};

// @desc  Notify admin when a ticket is assigned to them
const sendTicketAssignedEmail = async (admin, ticket) => {
  const subject = `New ticket assigned to you — Tealvue`;
  const html = `
    <div style="${baseStyle}">
      <h1 style="${tealStyle}">Tealvue</h1>
      <h2>New Ticket Assignment</h2>
      <p>Hi ${admin.name},</p>
      <p>A ticket has been assigned to you.</p>
      <div style="${cardStyle}">
        <p><strong>Ticket:</strong> ${ticket.title}</p>
        <p><strong>Priority:</strong> ${ticket.priority}</p>
        <p><strong>Category:</strong> ${ticket.category}</p>
      </div>
      <p>Please log in to Tealvue to review and respond.</p>
      <p style="color: #8b949e; font-size: 12px;">Tealvue Support Team</p>
    </div>
  `;
  await send(admin.email, subject, html);
};

// @desc  Notify user/admin when their account is approved
const sendAccountApprovedEmail = async (user) => {
  const subject = `Your Tealvue account has been approved`;
  const html = `
    <div style="${baseStyle}">
      <h1 style="${tealStyle}">Tealvue</h1>
      <h2>Account Approved</h2>
      <p>Hi ${user.name},</p>
      <p>Your account has been approved by a Super Admin. You can now log in.</p>
      <p style="color: #8b949e; font-size: 12px;">Tealvue Support Team</p>
    </div>
  `;
  await send(user.email, subject, html);
};

// @desc  Notify user when ticket is suspended
const sendTicketSuspendedEmail = async (user, ticket) => {
  const subject = `Your ticket is under review — ${ticket.title}`;
  const html = `
    <div style="${baseStyle}">
      <h1 style="${tealStyle}">Tealvue</h1>
      <h2>Ticket Under Review</h2>
      <p>Hi ${user.name},</p>
      <p>Your ticket has been flagged for review. It will be restored or a decision will be communicated shortly.</p>
      <div style="${cardStyle}">
        <p><strong>Ticket:</strong> ${ticket.title}</p>
        <p><strong>Ticket ID:</strong> #${ticket._id.toString().slice(-6).toUpperCase()}</p>
      </div>
      <p style="color: #8b949e; font-size: 12px;">Tealvue Support Team</p>
    </div>
  `;
  await send(user.email, subject, html);
};

// @desc  Notify user when ticket is rejected
const sendTicketRejectedEmail = async (user, ticket, note) => {
  const subject = `Your ticket has been rejected — ${ticket.title}`;
  const html = `
    <div style="${baseStyle}">
      <h1 style="${tealStyle}">Tealvue</h1>
      <h2>Ticket Rejected</h2>
      <p>Hi ${user.name},</p>
      <p>Your ticket has been rejected.</p>
      <div style="${cardStyle}">
        <p><strong>Ticket:</strong> ${ticket.title}</p>
        <p><strong>Reason:</strong> ${note}</p>
      </div>
      <p>If you believe this is a mistake, please contact support.</p>
      <p style="color: #8b949e; font-size: 12px;">Tealvue Support Team</p>
    </div>
  `;
  await send(user.email, subject, html);
};

// @desc  Notify user when ticket is restored
const sendTicketRestoredEmail = async (user, ticket) => {
  const subject = `Your ticket has been restored — ${ticket.title}`;
  const html = `
    <div style="${baseStyle}">
      <h1 style="${tealStyle}">Tealvue</h1>
      <h2>Ticket Restored</h2>
      <p>Hi ${user.name},</p>
      <p>Your ticket is now active and being processed.</p>
      <div style="${cardStyle}">
        <p><strong>Ticket:</strong> ${ticket.title}</p>
        <p><strong>Ticket ID:</strong> #${ticket._id.toString().slice(-6).toUpperCase()}</p>
      </div>
      <p style="color: #8b949e; font-size: 12px;">Tealvue Support Team</p>
    </div>
  `;
  await send(user.email, subject, html);
};

// @desc  Notify team when a ticket is assigned to them
const sendTeamAssignedEmail = async (team, ticket) => {
  const subject = `New ticket assigned to your team — Tealvue`;
  const html = `
    <div style="${baseStyle}">
      <h1 style="${tealStyle}">Tealvue</h1>
      <h2>New Ticket Team Assignment</h2>
      <p>Hi ${team.name},</p>
      <p>A ticket has been assigned to your team for resolution.</p>
      <div style="${cardStyle}">
        <p><strong>Ticket Title:</strong> ${ticket.title}</p>
        <p><strong>Priority:</strong> ${ticket.priority}</p>
        <p><strong>Category:</strong> ${ticket.category}</p>
        <p><strong>Description:</strong> ${ticket.description}</p>
      </div>
      <p>Please review and take action accordingly.</p>
      <p style="color: #8b949e; font-size: 12px;">Tealvue Support Team</p>
    </div>
  `;
  // We send the email to the team's Admin email address
  const User = require('../models/User');
  const teamAdminUser = await User.findById(team.teamAdmin);
  if (teamAdminUser) {
    await send(teamAdminUser.email, subject, html);
  }
};

module.exports = {
  sendTicketClosedEmail,
  sendTicketAssignedEmail,
  sendAccountApprovedEmail,
  sendTicketSuspendedEmail,
  sendTicketRejectedEmail,
  sendTicketRestoredEmail,
  sendTeamAssignedEmail,
};
