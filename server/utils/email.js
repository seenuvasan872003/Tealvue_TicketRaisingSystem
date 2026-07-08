// ============================================================
//  server/utils/email.js  —  Nodemailer Email Helper
// ============================================================

const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text }) => {
  try {
    const host = process.env.EMAIL_HOST || '';
    const user = process.env.EMAIL_USER || '';
    const isGmail = host.includes('gmail') || user.includes('gmail');

    const transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          }
        : {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: parseInt(process.env.EMAIL_PORT) === 465,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            tls: {
              rejectUnauthorized: false,
            },
          }
    );

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Tealvue Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SENT SUCCESS] Message ID: ${info.messageId} | Sent to: ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL SEND FAILURE] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendEmail };
