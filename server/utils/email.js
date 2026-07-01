// ============================================================
//  server/utils/email.js  —  Nodemailer Email Helper
// ============================================================

const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

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
