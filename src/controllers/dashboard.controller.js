// backend/src/controllers/dashboard.controller.js
const CompteModel = require('../models/compte.model');
const TransactionModel = require('../models/transaction.model');
const { successResponse, errorResponse } = require('../utils/response');
const { pool } = require('../config/database');

exports.getDashboardData = async (req, res) => {
  try {
    const stats = await CompteModel.getStats();
    const transactions = await TransactionModel.getSummary();
    const regionStats = await CompteModel.getStatsByRegion();

    const budgetTotal = parseFloat(stats.total_credit) || 0;
    const totalConsomme = parseFloat(stats.total_consomme) || 0;
    const tauxExecution = budgetTotal > 0 ? (totalConsomme / budgetTotal) * 100 : 0;

    // ✅ Récupérer les demandes en attente
    const demandesEnAttente = await TransactionModel.getDemandes('en_attente');

    // ✅ Récupérer les notifications non lues
    const notifications = await TransactionModel.getNotifications(req.userEmail);

    const dashboardData = {
      budget: {
        total: budgetTotal,
        consomme: totalConsomme,
        restant: budgetTotal - totalConsomme,
        taux: parseFloat(tauxExecution.toFixed(2))
      },
      transactions: {
        total: parseInt(transactions.total_transactions) || 0,
        montantTotal: parseFloat(transactions.total_montant) || 0,
        montantMoyen: parseFloat(transactions.montant_moyen) || 0
      },
      regions: regionStats.map(r => ({
        nom: r.region,
        total: parseFloat(r.total_credit) || 0,
        taux: parseFloat(r.taux_moyen) || 0,
        comptes: parseInt(r.total_comptes) || 0
      })),
      demandesEnAttente: demandesEnAttente.map(d => ({
        id: d.id,
        compte: d.num_compte,
        montant: d.montant_engagement,
        date: d.date_creation,
        demandeur: d.comptable_email
      })),
      notifications: notifications.map(n => ({
        id: n.id,
        message: n.message,
        type: n.type,
        date: n.date_creation,
        lien: n.lien
      })),
      alertes: await getAlertes()
    };

    return successResponse(res, 'Données du dashboard', dashboardData);
  } catch (error) {
    console.error('Erreur dashboard:', error);
    return errorResponse(res, 'Erreur lors de la récupération des données', 500);
  }
};

async function getAlertes() {
  const result = await pool.query(`
    SELECT * FROM alertes WHERE statut = 'Non lu' ORDER BY created_at DESC LIMIT 10
  `);
  return result.rows;
}