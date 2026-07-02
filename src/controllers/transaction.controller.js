const TransactionModel = require('../models/transaction.model');
const { successResponse, errorResponse } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const { statut, chapitre, annee, compte_id } = req.query;
    const transactions = await TransactionModel.findAll({ statut, chapitre, annee, compte_id });
    return successResponse(res, 'Liste des transactions', transactions);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la récupération des transactions', 500);
  }
};

exports.getSummary = async (req, res) => {
  try {
    const summary = await TransactionModel.getSummary();
    return successResponse(res, 'Résumé des transactions', summary);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la récupération du résumé', 500);
  }
};