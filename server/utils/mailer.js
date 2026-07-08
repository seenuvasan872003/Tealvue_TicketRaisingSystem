const nodemailer = require('nodemailer');

// ── Create a reusable transporter ─────────────────────────────────────────────
const createTransporter = () => {
  const host = process.env.EMAIL_HOST || '';
  const user = process.env.EMAIL_USER || '';
  const isGmail = host.includes('gmail') || user.includes('gmail');

  return nodemailer.createTransport(
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
          tls: { rejectUnauthorized: false },
        }
  );
};

// ── Send OTP / block email ─────────────────────────────────────────────────────
const sendOTPEmail = async ({ to, otp, type, blockedMinutes }) => {
  try {
    const transporter = createTransporter();
    const isBlock = type === 'blocked';
    const senderName = 'Tealvue';
    const fromAddress = `${senderName} <${process.env.EMAIL_USER}>`;

    // ── Subject — clear and contains OTP ──────────────────────────────────
    const subject = isBlock
      ? 'Your Tealvue account has been temporarily locked'
      : type === 'register'
        ? `Tealvue Registration OTP: ${otp}`
        : `Tealvue Login OTP: ${otp}`;

    // ── Plain text version (critical for inbox delivery) ─────────────────────
    const plainText = isBlock
      ? `Your Tealvue account has been temporarily locked for ${blockedMinutes} minutes due to too many incorrect attempts. Please try again later.`
      : type === 'register'
        ? `Your Tealvue registration OTP is: ${otp}\n\nThis code expires in 30 minutes. Do not share it with anyone.`
        : `Your Tealvue login OTP is: ${otp}\n\nThis code expires in 30 minutes. Do not share it with anyone.`;

    // ── HTML version ──────────────────────────────────────────────────────────
    const otpRow = isBlock ? '' : `
      <tr>
        <td style="padding: 0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="
                background-color: #1a1a1a;
                border: 1px solid #222;
                border-radius: 8px;
                padding: 20px;
                font-size: 36px;
                font-weight: 700;
                letter-spacing: 16px;
                color: #14a07d;
                font-family: 'Courier New', Courier, monospace;
              ">${otp}</td>
            </tr>
          </table>
        </td>
      </tr>`;

    const bodyText = isBlock
      ? `Your account has been temporarily locked for <strong>${blockedMinutes} minutes</strong> due to too many incorrect OTP attempts. Please try again after the lockout expires.`
      : type === 'register'
        ? 'Enter this code on the verification page to activate your account. It expires in <strong>30 minutes</strong>.'
        : 'Enter this code to complete signing in to your account. It expires in <strong>30 minutes</strong>.';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(90deg,#14a07d,#0f766e);padding:20px 32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">Tealvue</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <h2 style="margin:0 0 12px;font-size:20px;color:#111111;font-weight:700;">
                ${isBlock ? 'Account Locked' : 'Your verification code'}
              </h2>
              <p style="margin:0;font-size:14px;color:#555555;line-height:1.6;">
                ${bodyText}
              </p>
            </td>
          </tr>

          <!-- OTP box -->
          ${otpRow}

          <!-- Footer note -->
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:12px;color:#999999;text-align:center;line-height:1.5;">
                If you did not request this, you can safely ignore this email.<br>
                Do not share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Bottom bar -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e0e0e0;background-color:#fafafa;">
              <p style="margin:0;font-size:11px;color:#aaaaaa;text-align:center;">
                Tealvue &mdash; Internal Ticket Management System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: plainText,   // plain-text alternative — critical for spam score
      html,
      headers: {
        'X-Priority':        '1',
        'X-MSMail-Priority': 'High',
        'Importance':        'High',
        'X-Mailer':          'Tealvue Mailer 1.0',
      },
    });

    console.log(`[OTP EMAIL SENT] To: ${to} | Type: ${type}`);
    return { success: true };
  } catch (err) {
    console.error(`[OTP EMAIL FAILED] To: ${to} |`, err.message);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
};

module.exports = { sendOTPEmail };
