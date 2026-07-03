// backend/src/controllers/transaction.controller.js
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

// ✅ NOUVEAU : Récupérer les demandes de transaction
exports.getDemandes = async (req, res) => {
  try {
    const { statut } = req.query;
    const demandes = await TransactionModel.getDemandes(statut);
    return successResponse(res, 'Liste des demandes', demandes);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la récupération des demandes', 500);
  }
};

// ✅ NOUVEAU : Créer une demande de transaction
exports.createDemande = async (req, res) => {
  try {
    const demande = await TransactionModel.createDemande(req.body);
    return successResponse(res, 'Demande créée avec succès', demande, 201);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la création de la demande', 500);
  }
};

// ✅ NOUVEAU : Approuver une demande
exports.approuverDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_email } = req.body;
    const demande = await TransactionModel.approuverDemande(id, admin_email);
    return successResponse(res, 'Demande approuvée avec succès', demande);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de l\'approbation', 500);
  }
};

// ✅ NOUVEAU : Refuser une demande
exports.refuserDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_email } = req.body;
    const demande = await TransactionModel.refuserDemande(id, admin_email);
    return successResponse(res, 'Demande refusée', demande);
  } catch (error) {
    return errorResponse(res, 'Erreur lors du refus', 500);
  }
};

// ✅ NOUVEAU : Récupérer les notifications
exports.getNotifications = async (req, res) => {
  try {
    const { email } = req.query;
    const notifications = await TransactionModel.getNotifications(email);
    return successResponse(res, 'Notifications', notifications);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la récupération des notifications', 500);
  }
};

// ✅ NOUVEAU : Marquer une notification comme lue
exports.marquerNotificationLue = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await TransactionModel.marquerNotificationLue(id);
    return successResponse(res, 'Notification marquée comme lue', notification);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la mise à jour', 500);
  }
};