const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireClubLeaderOr, requireOwnClub } = require('../middleware/clubScope');
const ctrl = require('../controllers/clubs.controller');

router.get('/', ctrl.listClubs);
router.get('/mine', requireAuth, ctrl.myClub);
router.get('/joined', requireAuth, ctrl.myMemberships);
router.get('/:id', ctrl.getClub);
router.post('/:id/join', requireAuth, ctrl.joinClub);
router.delete('/:id/join', requireAuth, ctrl.leaveClub);
router.patch('/:id', requireAuth, requireClubLeaderOr('admin'), ctrl.updateClub);
router.get('/:id/assignments', requireAuth, ctrl.listAssignments);
router.get('/:id/assignment-candidates', requireAuth, ctrl.listAssignmentCandidates);
router.post('/:id/assignments', requireAuth, requireClubLeaderOr('admin'), ctrl.assignClubMember);
router.delete('/:id/assignments/:assignmentId', requireAuth, requireClubLeaderOr('admin'), ctrl.removeClubAssignment);

router.post('/requests', requireAuth, ctrl.submitClubRequest);
router.get('/requests/mine', requireAuth, ctrl.myClubRequests);
router.get('/requests/all', requireAuth, requireRole('admin'), ctrl.listClubRequests);
router.post('/requests/:id/review', requireAuth, requireRole('admin'), ctrl.reviewClubRequest);

module.exports = router;
