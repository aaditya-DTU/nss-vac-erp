const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/dashboardController');

router.use(protect);

router.get('/admin', authorize('admin'), ctrl.adminDashboard);
router.get('/student', authorize('student'), ctrl.studentDashboard);
router.get('/leaderboard', ctrl.leaderboard);

module.exports = router;
