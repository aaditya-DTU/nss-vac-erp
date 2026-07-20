const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/chatbotController');

router.use(protect);

router.post('/ask', ctrl.ask);
router.get('/history', ctrl.getHistory);
router.delete('/history', ctrl.clearHistory);
router.get('/greeting', ctrl.greeting);
router.post('/messages/:messageId/feedback', ctrl.giveFeedback);

router.get('/faqs', authorize('admin'), ctrl.listFaqs);
router.post('/faqs', authorize('admin'), ctrl.createFaq);
router.delete('/faqs/:id', authorize('admin'), ctrl.deleteFaq);

router.get('/unanswered', authorize('admin'), ctrl.listUnanswered);
router.post('/unanswered/:id/resolve', authorize('admin'), ctrl.resolveUnanswered);

module.exports = router;