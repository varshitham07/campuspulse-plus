const router = require('express').Router();
const { requireAuth, attachUserIfPresent } = require('../middleware/auth');
const { requireClubLeaderOr } = require('../middleware/clubScope');
const ctrl = require('../controllers/forms.controller');

router.get('/club/:clubId', ctrl.listFormsForClub);
router.get('/:id', attachUserIfPresent, ctrl.getForm);
router.post('/:id/submit', requireAuth, ctrl.submitResponse);

router.post('/', requireAuth, requireClubLeaderOr('admin'), ctrl.createForm);
router.patch('/:id/open', requireAuth, requireClubLeaderOr('admin'), ctrl.setFormOpen);
router.get('/:id/responses', requireAuth, requireClubLeaderOr('admin'), ctrl.listResponses);

module.exports = router;
