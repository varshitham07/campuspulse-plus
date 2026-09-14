const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

router.use(requireAuth, requireRole('admin'));
router.get('/overview', ctrl.overview);
router.get('/users', ctrl.listUsers);
router.patch('/users/:id/role', ctrl.updateUserRole);
router.patch('/users/:id/active', ctrl.setUserActive);
router.patch('/clubs/:id/leadership', ctrl.updateClubLeadership);
router.get('/registrations/pending', ctrl.listPendingRegistrations);
router.post('/registrations/:token/review', ctrl.reviewStudentRegistration);
router.get('/departments', ctrl.listDepartments);
router.get('/classes', ctrl.listClasses);
router.post('/classes', ctrl.createClass);
router.get('/teachers', ctrl.listActiveTeachers);
router.patch('/classes/:classId/teacher', ctrl.assignClassTeacher);
router.get('/audit-log', ctrl.listAuditLog);
router.get('/notifications-summary', ctrl.listNotificationsSummary);

module.exports = router;
