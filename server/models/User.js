const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'student'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'student' },

    // Student-specific academic identity (DTU context)
    rollNo: { type: String, trim: true, sparse: true, unique: true },
    branch: { type: String, trim: true },
    year: { type: Number, min: 1, max: 4 },
    section: { type: String, trim: true },

    avatarUrl: { type: String, default: '' },
    phone: { type: String, trim: true },

    // Gamification / NSS tracking (student only, but harmless if unused for admin)
    totalHours: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    badges: [{ type: String }],

    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false }, // gated by email OTP — see EmailOtp model + authController
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;