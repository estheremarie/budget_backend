const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Routes d'authentification
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.me);

// ✅ Routes pour la récupération avec code
router.post('/send-recovery-code', authController.sendRecoveryCode);
router.post('/reset-with-code', authController.resetWithCode);

// Anciennes routes (conservées pour compatibilité)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;