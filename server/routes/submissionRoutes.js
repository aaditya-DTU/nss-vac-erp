const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/submissionController');

router.use(protect);

router.get('/gallery', ctrl.gallery);
router.post('/tasks/:taskId', authorize('student'), upload.single('proof'), ctrl.submitProof);
router.patch('/:id/review', authorize('admin'), ctrl.reviewSubmission);
router.get('/me/completed', authorize('student'), ctrl.myCompletedTasks);

module.exports = router;