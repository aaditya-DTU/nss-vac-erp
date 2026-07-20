const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/announcementController');

router.use(protect);

router.get('/', ctrl.listAnnouncements);
router.get('/unread-count', ctrl.unreadCount);
router.post('/', authorize('admin'), ctrl.createAnnouncement);
router.patch('/:id', authorize('admin'), ctrl.updateAnnouncement);
router.delete('/:id', authorize('admin'), ctrl.deleteAnnouncement);
router.post('/:id/read', ctrl.markRead);

module.exports = router;
