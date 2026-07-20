const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/taskController');

router.use(protect);

router.get('/', ctrl.listTasks);
router.post('/', authorize('admin'), ctrl.createTask);
router.get('/:id', ctrl.getTask);
router.patch('/:id', authorize('admin'), ctrl.updateTask);
router.delete('/:id', authorize('admin'), ctrl.deleteTask);
router.get('/:id/submissions', authorize('admin'), ctrl.getTaskSubmissions);

module.exports = router;
