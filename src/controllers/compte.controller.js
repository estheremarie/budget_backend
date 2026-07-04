// backend/src/controllers/compte.controller.js
const CompteModel = require('../models/compte.model');
const { successResponse, errorResponse } = require('../utils/response');

// ============================================================
// GESTION DES COMPTES
// ============================================================

/**
 * Récupérer tous les comptes
 * GET /api/comptes
 */
const getAll = async (req, res) => {
  try {
    const { annee, region } = req.query;
    const comptes = await CompteModel.findAll(annee, region);
    return successResponse(res, 'Liste des comptes', comptes);
  } catch (error) {
    console.error('❌ Erreur getAll:', error);
    return errorResponse(res, 'Erreur lors de la récupération des comptes', 500);
  }
};

/**
 * Récupérer un compte par son ID
 * GET /api/comptes/:id
 */
const getById = async (req, res) => {
  try {
    const compte = await CompteModel.findById(req.params.id);
    if (!compte) {
      return errorResponse(res, 'Compte non trouvé', 404);
    }
    return successResponse(res, 'Détails du compte', compte);
  } catch (error) {
    console.error('❌ Erreur getById:', error);
    return errorResponse(res, 'Erreur lors de la récupération du compte', 500);
  }
};

/**
 * Créer un nouveau compte
 * POST /api/comptes
 */
const create = async (req, res) => {
  try {
    const compte = await CompteModel.create(req.body);
    return successResponse(res, 'Compte créé avec succès', compte, 201);
  } catch (error) {
    console.error('❌ Erreur create:', error);
    return errorResponse(res, 'Erreur lors de la création du compte', 500);
  }
};

/**
 * Mettre à jour un compte
 * PUT /api/comptes/:id
 */
const update = async (req, res) => {
  try {
    const compte = await CompteModel.update(req.params.id, req.body);
    if (!compte) {
      return errorResponse(res, 'Compte non trouvé', 404);
    }
    return successResponse(res, 'Compte modifié avec succès', compte);
  } catch (error) {
    console.error('❌ Erreur update:', error);
    return errorResponse(res, 'Erreur lors de la modification du compte', 500);
  }
};

/**
 * Supprimer un compte (soft delete)
 * DELETE /api/comptes/:id
 */
const deleteCompte = async (req, res) => {
  try {
    const compte = await CompteModel.delete(req.params.id);
    if (!compte) {
      return errorResponse(res, 'Compte non trouvé', 404);
    }
    return successResponse(res, 'Compte supprimé avec succès');
  } catch (error) {
    console.error('❌ Erreur deleteCompte:', error);
    return errorResponse(res, 'Erreur lors de la suppression du compte', 500);
  }
};

// ============================================================
// STATISTIQUES
// ============================================================

/**
 * Récupérer les statistiques générales des comptes
 * GET /api/comptes/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await CompteModel.getStats();
    return successResponse(res, 'Statistiques des comptes', stats);
  } catch (error) {
    console.error('❌ Erreur getStats:', error);
    return errorResponse(res, 'Erreur lors de la récupération des statistiques', 500);
  }
};

/**
 * Récupérer les statistiques par région
 * GET /api/comptes/region-stats
 */
const getRegionStats = async (req, res) => {
  try {
    const stats = await CompteModel.getStatsByRegion();
    return successResponse(res, 'Statistiques par région', stats);
  } catch (error) {
    console.error('❌ Erreur getRegionStats:', error);
    return errorResponse(res, 'Erreur lors de la récupération des statistiques', 500);
  }
};

// ============================================================
// GESTION DES RÉGULATIONS
// ============================================================

/**
 * Récupérer les régulations d'un compte
 * GET /api/comptes/regulations
 */
const getRegulations = async (req, res) => {
  try {
    const { num_compte, annee } = req.query;
    
    if (!num_compte) {
      return errorResponse(res, 'Le paramètre num_compte est requis', 400);
    }
    
    const regulations = await CompteModel.getRegulations(num_compte, annee || 2025);
    return successResponse(res, 'Régulations du compte', regulations);
  } catch (error) {
    console.error('❌ Erreur getRegulations:', error);
    return errorResponse(res, 'Erreur lors de la récupération des régulations', 500);
  }
};

/**
 * Mettre à jour une régulation
 * PUT /api/comptes/regulations
 */
const updateRegulation = async (req, res) => {
  try {
    const { num_compte, annee, trimestre, taux_regulation } = req.body;
    
    if (!num_compte || !annee || !trimestre || taux_regulation === undefined) {
      return errorResponse(res, 'Tous les champs sont requis: num_compte, annee, trimestre, taux_regulation', 400);
    }
    
    const regulation = await CompteModel.updateRegulation(num_compte, annee, trimestre, taux_regulation);
    return successResponse(res, 'Régulation mise à jour avec succès', regulation);
  } catch (error) {
    console.error('❌ Erreur updateRegulation:', error);
    return errorResponse(res, 'Erreur lors de la mise à jour de la régulation', 500);
  }
};

/**
 * Recalculer automatiquement les régulations
 * POST /api/comptes/regulations/recalculate
 */
const recalculateRegulations = async (req, res) => {
  try {
    const { num_compte, annee } = req.body;
    
    if (!num_compte || !annee) {
      return errorResponse(res, 'num_compte et annee sont requis', 400);
    }
    
    await CompteModel.updateRegulationsAuto(num_compte, annee);
    return successResponse(res, 'Régulations recalculées avec succès');
  } catch (error) {
    console.error('❌ Erreur recalculateRegulations:', error);
    return errorResponse(res, 'Erreur lors du recalcul des régulations', 500);
  }
};

// ============================================================
// GESTION DES CRÉDITS ANNUELS
// ============================================================

/**
 * Récupérer les crédits annuels d'un compte
 * GET /api/comptes/credits-annuels
 */
const getCreditsAnnules = async (req, res) => {
  try {
    const { num_compte, annee } = req.query;
    
    if (!num_compte) {
      return errorResponse(res, 'Le paramètre num_compte est requis', 400);
    }
    
    const credits = await CompteModel.getCreditsAnnules(num_compte, annee || 2025);
    return successResponse(res, 'Crédits annuels du compte', credits);
  } catch (error) {
    console.error('❌ Erreur getCreditsAnnules:', error);
    return errorResponse(res, 'Erreur lors de la récupération des crédits annuels', 500);
  }
};

// ============================================================
// EXPORT DES FONCTIONS
// ============================================================

module.exports = {
  // Gestion des comptes
  getAll,
  getById,
  create,
  update,
  deleteCompte,
  
  // Statistiques
  getStats,
  getRegionStats,
  
  // Régulations
  getRegulations,
  updateRegulation,
  recalculateRegulations,
  
  // Crédits annuels
  getCreditsAnnules,
};