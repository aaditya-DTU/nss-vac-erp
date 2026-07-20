const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// One document per email awaiting verification. The OTP is hashed (never
// stored in plaintext) — same reasoning as passwords: even a DB leak
// shouldn't hand out working codes. `attempts` caps brute-force guessing at
// the 6-digit code, and `lastSentAt` backs the resend cooldown.
const emailOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// MongoDB TTL index — expired OTP documents are automatically garbage
// collected, so there's no stale-record cleanup job to remember to write.
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

emailOtpSchema.methods.compareOtp = function (candidate) {
  return bcrypt.compare(candidate, this.otpHash);
};

module.exports = mongoose.model('EmailOtp', emailOtpSchema);