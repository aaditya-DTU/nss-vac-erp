const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const { generateOtp } = require('../utils/otp');
const { sendPasswordResetOtpEmail } = require('../utils/mailer');
const { OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS, OTP_MAX_ATTEMPTS } = require('../utils/otpHelpers');

// Three-step flow, kept on its own model and its own controller, separate
// from registration-OTP (otpController.js):
//   1. POST /forgot-password   { email }                    -> emails a 6-digit code
//   2. POST /verify-reset-otp  { email, otp }                -> returns a short-lived resetToken
//   3. POST /reset-password    { resetToken, newPassword }   -> sets the new password
//
// Splitting steps 2 and 3 means the OTP itself is single-use and never
// travels alongside the new password in the final request — the resetToken
// (a short-lived JWT, not the OTP) is what authorizes the password change.

function signResetToken(user) {
  return jwt.sign({ id: user._id, purpose: 'password_reset' }, process.env.JWT_SECRET, {
    expiresIn: '10m',
  });
}

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'student' });

    // Deliberately explicit here, not generic — for an app restricted to
    // @dtu.ac.in accounts, telling someone their email isn't registered
    // costs little (it's not a public consumer app where enumeration is a
    // real attack surface) and saves them from silently waiting on an
    // email that will never arrive. They get routed straight to register.
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        accountNotFound: true,
        message: 'No account is linked with this email.',
      });
    }

    const existing = await PasswordResetOtp.findOne({ email: email.toLowerCase() });
    if (existing) {
      const msSinceLastSend = Date.now() - existing.lastSentAt.getTime();
      if (msSinceLastSend < OTP_RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - msSinceLastSend) / 1000);
        return res.status(429).json({ success: false, message: `Please wait ${waitSeconds}s before requesting another code.` });
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await PasswordResetOtp.findOneAndUpdate(
      { email: email.toLowerCase() },
      { otpHash, expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0, lastSentAt: new Date(), verified: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendPasswordResetOtpEmail(email, otp);

    res.json({ success: true, message: 'A reset code has been sent to your email.' });
  } catch (err) {
    next(err);
  }
};

exports.verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and code are required.' });
    }

    const record = await PasswordResetOtp.findOne({ email: email.toLowerCase() });
    if (!record) {
      return res.status(400).json({ success: false, message: 'No pending reset request for this email. Please start again.' });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This code has expired. Request a new one.' });
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Request a new code.' });
    }

    const isMatch = await record.compareOtp(otp);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      const remaining = OTP_MAX_ATTEMPTS - record.attempts;
      return res.status(400).json({ success: false, message: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} left.` });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'student' });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    record.verified = true;
    await record.save();

    const resetToken = signResetToken(user);
    res.json({ success: true, resetToken });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'A valid code verification and a new password (min 6 chars) are required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'This reset session has expired. Please start again.' });
    }
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset session.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    // Require that verify-reset-otp actually succeeded for this email —
    // the JWT alone proves the OTP step passed at signing time, but this
    // extra check + deleting the record makes the whole reset flow
    // single-use: a resetToken can't be replayed after a successful reset,
    // and a still-valid-but-unverified record can't skip straight to here.
    const record = await PasswordResetOtp.findOne({ email: user.email, verified: true });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Please verify your code again before resetting your password.' });
    }

    user.password = newPassword;
    await user.save();
    await PasswordResetOtp.deleteOne({ email: user.email });

    // Deliberately not auto-logging-in here (unlike verifyOtp for
    // registration) — after a password reset, forcing an explicit login
    // with the new password is the safer default.
    res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
};