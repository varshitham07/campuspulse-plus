const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireClubLeaderOr } = require('../middleware/clubScope');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/media.controller');

router.get('/club/:clubId', ctrl.listMediaForClub);
router.post('/', requireAuth, requireClubLeaderOr('admin'), upload.single('file'), ctrl.uploadMedia);
router.delete('/:id', requireAuth, requireClubLeaderOr('admin'), ctrl.deleteMedia);

module.exports = router;
