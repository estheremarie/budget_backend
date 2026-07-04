// backend/src/routes/compte.routes.js
const express = require('express');
const router = express.Router();
const compteController = require('../controllers/compte.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Routes de base
router.get('/', verifyToken, compteController.getAll);
router.get('/stats', verifyToken, compteController.getStats);
router.get('/region-stats', verifyToken, compteController.getRegionStats);
router.get('/:id', verifyToken, compteController.getById);
router.post('/', verifyToken, compteController.create);
router.put('/:id', verifyToken, compteController.update);
router.delete('/:id', verifyToken, compteController.deleteCompte); // ✅ Utiliser deleteCompte

// Routes des régulations
router.get('/regulations', verifyToken, compteController.getRegulations);
router.put('/regulations', verifyToken, compteController.updateRegulation);
router.post('/regulations/recalculate', verifyToken, compteController.recalculateRegulations);

// Routes des crédits annuels
router.get('/credits-annuels', verifyToken, compteController.getCreditsAnnules);

module.exports = router;