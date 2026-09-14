const router=require('express').Router();
const {requireAuth,attachUserIfPresent}=require('../middleware/auth');
const {requireClubLeaderOr}=require('../middleware/clubScope');
const ctrl=require('../controllers/announcements.controller');
router.get('/',attachUserIfPresent,ctrl.listAnnouncements);
router.post('/classify-preview',requireAuth,requireClubLeaderOr('admin','teacher'),ctrl.suggestClassification);
router.post('/',requireAuth,requireClubLeaderOr('admin','teacher'),ctrl.createAnnouncement);
router.delete('/:id',requireAuth,ctrl.deleteAnnouncement);
module.exports=router;
