const express = require('express');
const router = express.Router();
const compteController = require('../controllers/compte.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, compteController.getAll);
router.get('/stats', verifyToken, compteController.getStats);
router.get('/region-stats', verifyToken, compteController.getRegionStats);
router.get('/:id', verifyToken, compteController.getById);
router.post('/', verifyToken, compteController.create);
router.put('/:id', verifyToken, compteController.update);
router.delete('/:id', verifyToken, compteController.delete);

module.exports = router;