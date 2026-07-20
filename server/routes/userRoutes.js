const express = require('express');
const router = express.Router();
const multer = require('multer');
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/userController');

router.use(protect);

router.get('/', authorize('admin'), ctrl.listUsers);
router.post('/', authorize('admin'), ctrl.createUser);
router.post('/bulk-import', authorize('admin'), memoryUpload.single('file'), ctrl.bulkImport);
router.get('/:id', authorize('admin'), ctrl.getUser);
router.get('/:id/activity', authorize('admin'), ctrl.getStudentActivity);
router.patch('/:id', authorize('admin'), ctrl.updateUser);
router.delete('/:id', authorize('admin'), ctrl.deleteUser);

module.exports = router;