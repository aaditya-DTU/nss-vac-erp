const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/reportController');

router.get('/nss-summary', protect, authorize('admin'), ctrl.exportNssReport);

module.exports = router;
