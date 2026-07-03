// backend/src/routes/transaction.routes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Routes existantes
router.get('/', verifyToken, transactionController.getAll);
router.get('/summary', verifyToken, transactionController.getSummary);

// ✅ NOUVELLES ROUTES
router.get('/demandes', verifyToken, transactionController.getDemandes);
router.post('/demandes', verifyToken, transactionController.createDemande);
router.put('/demandes/:id/approuver', verifyToken, transactionController.approuverDemande);
router.put('/demandes/:id/refuser', verifyToken, transactionController.refuserDemande);

// Routes des notifications
router.get('/notifications', verifyToken, transactionController.getNotifications);
router.put('/notifications/:id/lire', verifyToken, transactionController.marquerNotificationLue);

module.exports = router;