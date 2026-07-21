const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Deliberately a separate collection from EmailOtp rather than a shared one
// with a `purpose` field. Registration-OTP verification (verifyOtp) flips
// isVerified and logs the user in on success — that logic must never be
// reachable from a password-reset code. Keeping them as two models makes
// that impossible by construction instead of relying on an if-check.
const passwordResetOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    // Set once the OTP has been verified, so verify-reset-otp is single-use
    // and a leaked/replayed code can't be used to reset the password twice.
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index — expired/abandoned reset requests are garbage collected
// automatically, same pattern as EmailOtp.
passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

passwordResetOtpSchema.methods.compareOtp = function (candidate) {
  return bcrypt.compare(candidate, this.otpHash);
};

module.exports = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);