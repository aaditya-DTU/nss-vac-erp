const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/certificateController');

// Public route — must be registered before `protect` is applied below.
router.get('/verify/:certificateId', ctrl.verifyCertificate);

router.use(protect);

router.post('/issue/:studentId', authorize('admin'), ctrl.issueCertificate);
router.get('/me', authorize('student'), ctrl.myCertificate);

module.exports = router;
