const router = require('express').Router();
const { requireAuth, requireRole, attachUserIfPresent } = require('../middleware/auth');
const ctrl = require('../controllers/incidents.controller');

router.get('/', ctrl.listIncidents);
router.get('/:id', attachUserIfPresent, ctrl.getIncident);
router.post('/', requireAuth, ctrl.reportIncident);
router.post('/:id/vote', requireAuth, ctrl.voteOnIncident);
router.post('/:id/verify', requireAuth, requireRole('admin', 'teacher'), ctrl.officiallyVerify);

module.exports = router;
