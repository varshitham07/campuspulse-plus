const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/navigation.controller');

router.get('/locations', ctrl.listLocations);
router.get('/route', ctrl.getRoute);
router.post('/sessions', requireAuth, ctrl.startNavigation);
router.delete('/sessions/:id', requireAuth, ctrl.endNavigation);

router.get('/edges', requireAuth, requireRole('admin'), ctrl.listEdges);
router.post('/locations', requireAuth, requireRole('admin'), ctrl.createLocation);
router.post('/edges', requireAuth, requireRole('admin'), ctrl.createEdge);

module.exports = router;
