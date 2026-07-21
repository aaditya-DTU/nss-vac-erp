const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const EmailOtp = require('../models/EmailOtp');
const { generateOtp } = require('./otp');
const { sendOtpEmail } = require('./mailer');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_MAX_ATTEMPTS = 5;

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Locks self-registration to the university domain. Configurable via env
// so this same codebase works for any institution, not just DTU.
function isAllowedEmailDomain(email) {
  const domain = (process.env.ALLOWED_EMAIL_DOMAIN || 'dtu.ac.in').toLowerCase();
  return email.toLowerCase().endsWith(`@${domain}`);
}

// Registration-OTP issuer (EmailOtp collection) — shared by
// authController.register() and otpController.resendOtp(), so both
// always create/refresh the code the exact same way.
async function issueRegistrationOtp(email) {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  await EmailOtp.findOneAndUpdate(
    { email: email.toLowerCase() },
    { otpHash, expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0, lastSentAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendOtpEmail(email, otp);
}

module.exports = {
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  signToken,
  isAllowedEmailDomain,
  issueRegistrationOtp,
};