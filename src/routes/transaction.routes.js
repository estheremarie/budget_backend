const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, transactionController.getAll);
router.get('/summary', verifyToken, transactionController.getSummary);

module.exports = router;