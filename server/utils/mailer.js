const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// Falls back to logging the OTP to the server console when SMTP isn't
// configured — this is deliberate, the same pattern used for the chatbot's
// LLM providers: the feature should be fully testable/demoable before
// anyone has to go set up a mail account, not blocked on it.
async function sendOtpEmail(email, otp) {
  const t = getTransporter();

  if (!t) {
    console.log(`\n[mailer] SMTP not configured — OTP for ${email}: ${otp}\n`);
    return { delivered: false, mode: 'console' };
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || `"NSS VAC ERP" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your NSS VAC ERP verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: auto;">
        <p style="color:#1565C0; font-size:12px; letter-spacing:1px; text-transform:uppercase;">NSS VAC · DTU</p>
        <h2 style="color:#0D47A1;">Verify your email</h2>
        <p>Your one-time verification code is:</p>
        <p style="font-size:32px; font-weight:700; letter-spacing:6px; color:#0D47A1;">${otp}</p>
        <p style="color:#666; font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  return { delivered: true, mode: 'smtp' };
}

async function sendPasswordResetOtpEmail(email, otp) {
  const t = getTransporter();

  if (!t) {
    console.log(`\n[mailer] SMTP not configured — password reset OTP for ${email}: ${otp}\n`);
    return { delivered: false, mode: 'console' };
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || `"NSS VAC ERP" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset your NSS VAC ERP password',
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: auto;">
        <p style="color:#1565C0; font-size:12px; letter-spacing:1px; text-transform:uppercase;">NSS VAC · DTU</p>
        <h2 style="color:#0D47A1;">Reset your password</h2>
        <p>Someone requested a password reset for this account. Use the code below to continue:</p>
        <p style="font-size:32px; font-weight:700; letter-spacing:6px; color:#0D47A1;">${otp}</p>
        <p style="color:#666; font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
      </div>
    `,
  });

  return { delivered: true, mode: 'smtp' };
}

module.exports = { sendOtpEmail, sendPasswordResetOtpEmail };