const router = require('express').Router();
const { requireAuth, attachUserIfPresent } = require('../middleware/auth');
const { requireOwnClub, requireClubLeaderOr } = require('../middleware/clubScope');
const ctrl = require('../controllers/events.controller');

router.get('/', ctrl.listEvents);
router.get('/:id', attachUserIfPresent, ctrl.getEvent);

// Identity (admin) OR responsibility (leads a club), scoped to the specific
// club via requireOwnClub — never a flattened "club_president" role check.
router.post('/', requireAuth, requireClubLeaderOr('admin'), requireOwnClub, ctrl.createEvent);
router.patch('/:id', requireAuth, requireClubLeaderOr('admin'), ctrl.updateEvent);
router.get('/:id/registrations', requireAuth, requireClubLeaderOr('admin'), ctrl.listRegistrations);

router.post('/:id/register', requireAuth, ctrl.registerForEvent);
router.delete('/:id/register', requireAuth, ctrl.cancelRegistration);

module.exports = router;
