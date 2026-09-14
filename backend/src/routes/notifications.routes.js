const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/notifications.controller');

router.get('/', requireAuth, ctrl.listNotifications);
router.post('/:id/read', requireAuth, ctrl.markRead);
router.post('/read-all', requireAuth, ctrl.markAllRead);

module.exports = router;
