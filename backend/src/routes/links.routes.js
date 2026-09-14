const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireClubLeaderOr } = require('../middleware/clubScope');
const ctrl = require('../controllers/links.controller');

router.get('/club/:clubId', ctrl.listLinksForClub);
router.post('/', requireAuth, requireClubLeaderOr('admin'), ctrl.addLink);
router.delete('/:id', requireAuth, requireClubLeaderOr('admin'), ctrl.deleteLink);

module.exports = router;
