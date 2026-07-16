// backend/src/controllers/dashboard.controller.js
const CompteModel = require('../models/compte.model');
const TransactionModel = require('../models/transaction.model');
const { successResponse, errorResponse } = require('../utils/response');
const { pool } = require('../config/database');

exports.getDashboardData = async (req, res) => {
  try {
    // Récupérer les statistiques des comptes
    const stats = await CompteModel.getStats();
    const regionStats = await CompteModel.getStatsByRegion();

    const budgetTotal = parseFloat(stats.total_credit) || 0;
    const totalConsomme = parseFloat(stats.total_consomme) || 0;
    const tauxExecution = budgetTotal > 0 ? (totalConsomme / budgetTotal) * 100 : 0;

    // Récupérer les transactions
    const transactionsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(montant_engager), 0) as total_engagements,
        COALESCE(SUM(montant_liquider), 0) as total_liquidations
      FROM transactions
    `);

    // Récupérer les demandes en attente
    const demandesEnAttente = await TransactionModel.getDemandes('en_attente');

    // Récupérer les notifications non lues
    const notifications = await TransactionModel.getNotifications(req.userEmail);

    // ✅ Récupérer les alertes - CORRIGÉ (ne pas utiliser date_creation)
    const alertesResult = await pool.query(`
      SELECT id, message, type, statut, compte_id, date_modification as date_creation
      FROM alertes 
      WHERE statut = 'Non lu' 
      ORDER BY date_modification DESC 
      LIMIT 10
    `);
    const alertes = alertesResult.rows;

    const dashboardData = {
      budget: {
        total: budgetTotal,
        consomme: totalConsomme,
        restant: budgetTotal - totalConsomme,
        taux: parseFloat(tauxExecution.toFixed(2)),
        total_engage: totalConsomme,
        total_liquide: totalConsomme,
        taux_engagement: parseFloat((totalConsomme / (budgetTotal || 1) * 100).toFixed(2)),
        taux_execution: parseFloat(tauxExecution.toFixed(2)),
        taux_liquidation: parseFloat((totalConsomme / (budgetTotal || 1) * 100).toFixed(2))
      },
      transactions: {
        total: parseInt(transactionsResult.rows[0]?.total) || 0,
        montantTotal: parseFloat(transactionsResult.rows[0]?.total_engagements) || 0,
        montantMoyen: 0
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
      alertes: alertes.map(a => ({
        id: a.id,
        message: a.message,
        type: a.type,
        date: a.date_creation,
        statut: a.statut
      }))
    };

    return successResponse(res, 'Données du dashboard', dashboardData);
  } catch (error) {
    console.error('❌ Erreur dashboard:', error);
    return errorResponse(res, 'Erreur lors de la récupération des données', 500);
  }
};