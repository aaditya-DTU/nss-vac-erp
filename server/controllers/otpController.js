const User = require('../models/User');
const EmailOtp = require('../models/EmailOtp');
const { setAuthCookie } = require('../utils/authCookie');
const { signToken, issueRegistrationOtp, OTP_RESEND_COOLDOWN_MS, OTP_MAX_ATTEMPTS } = require('../utils/otpHelpers');

// Registration-email verification — confirms the account belongs to a real
// inbox before it becomes usable. Kept separate from password-reset OTP
// verification (passwordResetController.js) on purpose: this flow flips
// isVerified and logs the user in on success, which must never be
// reachable from a password-reset code.
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and code are required.' });
    }

    const record = await EmailOtp.findOne({ email: email.toLowerCase() });
    if (!record) {
      return res.status(400).json({ success: false, message: 'No pending verification for this email. Please register again.' });
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

    const user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { isVerified: true }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found. Please register again.' });
    }

    await EmailOtp.deleteOne({ email: email.toLowerCase() });

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.isVerified) {
      return res.status(400).json({ success: false, message: 'No pending verification for this email.' });
    }

    const existingOtp = await EmailOtp.findOne({ email: email.toLowerCase() });
    if (existingOtp) {
      const msSinceLastSend = Date.now() - existingOtp.lastSentAt.getTime();
      if (msSinceLastSend < OTP_RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - msSinceLastSend) / 1000);
        return res.status(429).json({ success: false, message: `Please wait ${waitSeconds}s before requesting another code.` });
      }
    }

    await issueRegistrationOtp(email);
    res.json({ success: true, message: 'A new verification code has been sent.' });
  } catch (err) {
    next(err);
  }
};