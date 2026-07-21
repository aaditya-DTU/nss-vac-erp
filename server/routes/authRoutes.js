const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const authCtrl = require('../controllers/authController');
const otpCtrl = require('../controllers/otpController');
const resetCtrl = require('../controllers/passwordResetController');

// Registration + email verification
router.post('/register', authCtrl.register);
router.post('/verify-otp', otpCtrl.verifyOtp);
router.post('/resend-otp', otpCtrl.resendOtp);

// Core session
router.post('/login', authCtrl.login);
router.post('/logout', protect, authCtrl.logout);
router.get('/me', protect, authCtrl.me);
router.patch('/me', protect, authCtrl.updateMe);
router.post('/change-password', protect, authCtrl.changePassword);

// Forgot / reset password
router.post('/forgot-password', resetCtrl.forgotPassword);
router.post('/verify-reset-otp', resetCtrl.verifyResetOtp);
router.post('/reset-password', resetCtrl.resetPassword);

module.exports = router;