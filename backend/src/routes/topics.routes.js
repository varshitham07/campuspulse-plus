const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/topics.controller');

router.get('/', ctrl.listTopics);
router.get('/mine', requireAuth, ctrl.mySubscriptions);
router.post('/:id/subscribe', requireAuth, ctrl.subscribe);
router.delete('/:id/subscribe', requireAuth, ctrl.unsubscribe);
router.post('/', requireAuth, requireRole('admin'), ctrl.createTopic);

module.exports = router;
