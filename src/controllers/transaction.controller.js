// backend/src/controllers/transaction.controller.js
const TransactionModel = require('../models/transaction.model');
const { successResponse, errorResponse } = require('../utils/response');

// ✅ Récupérer toutes les transactions
exports.getAll = async (req, res) => {
  try {
    const { statut, chapitre, annee, compte_id } = req.query;
    const transactions = await TransactionModel.findAll({ statut, chapitre, annee, compte_id });
    return successResponse(res, 'Liste des transactions', transactions);
  } catch (error) {
    console.error('❌ Erreur getAll:', error);
    return errorResponse(res, 'Erreur lors de la récupération des transactions', 500);
  }
};

// ✅ Récupérer le résumé des transactions
exports.getSummary = async (req, res) => {
  try {
    const summary = await TransactionModel.getSummary();
    return successResponse(res, 'Résumé des transactions', summary);
  } catch (error) {
    console.error('❌ Erreur getSummary:', error);
    return errorResponse(res, 'Erreur lors de la récupération du résumé', 500);
  }
};

// ✅ NOUVELLE MÉTHODE : Créer une transaction directement (POST /api/transactions)
exports.createTransaction = async (req, res) => {
  try {
    console.log('📤 Création d\'une transaction...');
    console.log('📦 Données reçues:', req.body);
    
    const { 
      compte_id, 
      num_compte, 
      nom_compte,
      montant_engager, 
      montant_liquider, 
      date_transaction, 
      statut, 
      admin_id,
      taux_engagement,
      taux_execution,
      taux_liquidation
    } = req.body;

    // Vérifier les données obligatoires
    if (!compte_id || compte_id <= 0) {
      return errorResponse(res, 'Le compte_id est obligatoire', 400);
    }

    if (!montant_engager || montant_engager <= 0) {
      return errorResponse(res, 'Le montant à engager est obligatoire et doit être supérieur à 0', 400);
    }

    if (!montant_liquider || montant_liquider < 0) {
      return errorResponse(res, 'Le montant à liquider doit être supérieur ou égal à 0', 400);
    }

    if (montant_liquider > montant_engager) {
      return errorResponse(res, 'Le montant à liquider ne peut pas dépasser le montant à engager', 400);
    }

    // Utiliser le modèle pour créer la transaction
    const transaction = await TransactionModel.create({
      compte_id,
      num_compte: num_compte || '',
      nom_compte: nom_compte || '',
      montant_engager: parseFloat(montant_engager),
      montant_liquider: parseFloat(montant_liquider),
      date_transaction: date_transaction || new Date().toISOString().split('T')[0],
      statut: statut || 'approuve',
      admin_id: admin_id || req.user?.id || 'admin',
      taux_engagement: parseFloat(taux_engagement) || 0,
      taux_execution: parseFloat(taux_execution) || 0,
      taux_liquidation: parseFloat(taux_liquidation) || 0
    });

    console.log('✅ Transaction créée avec succès:', transaction);
    return successResponse(res, 'Transaction créée avec succès', transaction, 201);
  } catch (error) {
    console.error('❌ Erreur createTransaction:', error);
    return errorResponse(res, 'Erreur lors de la création de la transaction: ' + error.message, 500);
  }
};

// ✅ NOUVEAU : Récupérer les demandes de transaction
exports.getDemandes = async (req, res) => {
  try {
    const { statut } = req.query;
    const demandes = await TransactionModel.getDemandes(statut);
    return successResponse(res, 'Liste des demandes', demandes);
  } catch (error) {
    console.error('❌ Erreur getDemandes:', error);
    return errorResponse(res, 'Erreur lors de la récupération des demandes', 500);
  }
};

// ✅ NOUVEAU : Créer une demande de transaction
exports.createDemande = async (req, res) => {
  try {
    console.log('📤 Création d\'une demande...');
    console.log('📦 Données reçues:', req.body);
    
    const demande = await TransactionModel.createDemande(req.body);
    console.log('✅ Demande créée avec succès:', demande);
    return successResponse(res, 'Demande créée avec succès', demande, 201);
  } catch (error) {
    console.error('❌ Erreur createDemande:', error);
    return errorResponse(res, 'Erreur lors de la création de la demande', 500);
  }
};

// ✅ NOUVEAU : Approuver une demande
exports.approuverDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_email } = req.body;
    console.log(`✅ Approbation de la demande ${id} par ${admin_email || 'admin'}`);
    
    const demande = await TransactionModel.approuverDemande(id, admin_email);
    return successResponse(res, 'Demande approuvée avec succès', demande);
  } catch (error) {
    console.error('❌ Erreur approuverDemande:', error);
    return errorResponse(res, 'Erreur lors de l\'approbation', 500);
  }
};

// ✅ NOUVEAU : Refuser une demande
exports.refuserDemande = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_email } = req.body;
    console.log(`❌ Refus de la demande ${id} par ${admin_email || 'admin'}`);
    
    const demande = await TransactionModel.refuserDemande(id, admin_email);
    return successResponse(res, 'Demande refusée', demande);
  } catch (error) {
    console.error('❌ Erreur refuserDemande:', error);
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
    console.error('❌ Erreur getNotifications:', error);
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
    console.error('❌ Erreur marquerNotificationLue:', error);
    return errorResponse(res, 'Erreur lors de la mise à jour', 500);
  }
};

// ✅ Fonction utilitaire pour parser les nombres
function parseFloat(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}