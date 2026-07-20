const crypto = require('crypto');

// 6-digit numeric OTP. Uses crypto.randomInt (CSPRNG) rather than
// Math.random() — this is a security-sensitive code, not a cosmetic ID.
function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

module.exports = { generateOtp };