const router = require('express').Router();
const { register, login, requestOtp, verifyOtp, refresh, logout, me, publicDepartments, publicClasses } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/departments', publicDepartments);
router.get('/classes', publicClasses);
router.post('/register', register);
router.post('/login', login);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
