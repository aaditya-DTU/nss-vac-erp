const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/responsibilityController');

router.use(protect);

router.get('/', ctrl.listResponsibilities);
router.post('/', authorize('admin'), ctrl.createResponsibility);
router.post('/:id/claim', authorize('student'), ctrl.claimResponsibility);
router.post('/:id/complete', ctrl.completeResponsibility);
router.patch('/:id', authorize('admin'), ctrl.updateResponsibility);
router.delete('/:id', authorize('admin'), ctrl.deleteResponsibility);

module.exports = router;