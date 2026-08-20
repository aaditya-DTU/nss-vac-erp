const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/eventController');

router.use(protect);

router.get('/', ctrl.listEvents);
router.get('/:id', ctrl.getEvent);
router.post('/', authorize('admin'), ctrl.createEvent);
router.patch('/:id', authorize('admin'), ctrl.updateEvent);
router.post('/:id/register', authorize('student'), ctrl.registerForEvent);
router.post('/:id/attendance/open', authorize('admin'), ctrl.openAttendance);
router.post('/:id/attendance/close', authorize('admin'), ctrl.closeAttendance);
router.post('/:id/attendance/checkin', authorize('student'), ctrl.checkIn);
router.post('/:id/attendance/manual', authorize('admin'), ctrl.manualCheckIn);
router.get('/:id/attendance', authorize('admin'), ctrl.eventAttendanceList);
router.get('/:id/attendance/report', authorize('admin'), ctrl.exportEventAttendanceReport);

module.exports = router;
