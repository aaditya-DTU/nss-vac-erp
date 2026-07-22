const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/userController');

router.use(protect);

router.get('/', authorize('admin'), ctrl.listUsers);
router.post('/', authorize('admin'), ctrl.createUser);
router.get('/:id', authorize('admin'), ctrl.getUser);
router.get('/:id/activity', authorize('admin'), ctrl.getStudentActivity);
router.patch('/:id', authorize('admin'), ctrl.updateUser);
router.delete('/:id', authorize('admin'), ctrl.deleteUser);

module.exports = router;