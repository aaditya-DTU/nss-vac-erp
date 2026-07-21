const User = require('../models/User');
const { setAuthCookie, clearAuthCookie } = require('../utils/authCookie');
const { signToken, isAllowedEmailDomain, issueRegistrationOtp } = require('../utils/otpHelpers');

// Public self-registration is intentionally students-only, and gated behind
// two checks: the email must be on the university domain, and the account
// isn't actually usable (no JWT issued) until the OTP sent here is verified
// via POST /auth/verify-otp — see otpController.js. Admin (teacher/
// coordinator) accounts are still provisioned by an existing admin via
// POST /api/users, and are pre-verified there — this route can never
// create one.
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, rollNo, branch, year, section } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (!isAllowedEmailDomain(email)) {
      const domain = process.env.ALLOWED_EMAIL_DOMAIN || 'dtu.ac.in';
      return res.status(400).json({ success: false, message: `Registration is limited to @${domain} email addresses.` });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.isVerified) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Try logging in.' });
    }

    // If a previous registration attempt was never verified, overwrite it
    // rather than blocking the person from ever retrying — this also
    // naturally handles someone mistyping their password the first time.
    if (existing && !existing.isVerified) {
      existing.name = name;
      existing.password = password;
      existing.rollNo = rollNo;
      existing.branch = branch;
      existing.year = year;
      existing.section = section;
      await existing.save();
    } else {
      await User.create({ name, email, password, rollNo, branch, year, section, role: 'student', isVerified: false });
    }

    await issueRegistrationOtp(email);

    res.status(201).json({
      success: true,
      message: 'Verification code sent to your DTU email. Enter it to finish creating your account.',
      email: email.toLowerCase(),
      requiresVerification: true,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Contact your NSS admin.' });
    }
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email before logging in.',
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
};

// JS cannot clear an httpOnly cookie on its own — the client calling this
// endpoint (which responds with a Set-Cookie that immediately expires it) is
// the only way to actually log out.
exports.logout = async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out.' });
};

exports.updateMe = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'avatarUrl', 'branch', 'year', 'section'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Current password and a new password (min 6 chars) are required.' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};