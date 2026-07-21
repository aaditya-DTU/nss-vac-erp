const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/ideaController');

router.use(protect);

router.get('/', ctrl.listIdeas);
router.post('/', authorize('student'), ctrl.submitIdea);
router.post('/:id/upvote', ctrl.toggleUpvote);
router.patch('/:id/status', authorize('admin'), ctrl.updateIdeaStatus);
router.delete('/:id', ctrl.deleteIdea);

module.exports = router;