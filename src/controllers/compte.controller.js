const CompteModel = require('../models/compte.model');
const { successResponse, errorResponse } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const { annee, region } = req.query;
    const comptes = await CompteModel.findAll(annee, region);
    return successResponse(res, 'Liste des comptes', comptes);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la récupération des comptes', 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const compte = await CompteModel.findById(req.params.id);
    if (!compte) {
      return errorResponse(res, 'Compte non trouvé', 404);
    }
    return successResponse(res, 'Détails du compte', compte);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la récupération du compte', 500);
  }
};

exports.create = async (req, res) => {
  try {
    const compte = await CompteModel.create(req.body);
    return successResponse(res, 'Compte créé avec succès', compte, 201);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la création du compte', 500);
  }
};

exports.update = async (req, res) => {
  try {
    const compte = await CompteModel.update(req.params.id, req.body);
    if (!compte) {
      return errorResponse(res, 'Compte non trouvé', 404);
    }
    return successResponse(res, 'Compte modifié avec succès', compte);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la modification du compte', 500);
  }
};

exports.delete = async (req, res) => {
  try {
    const compte = await CompteModel.delete(req.params.id);
    if (!compte) {
      return errorResponse(res, 'Compte non trouvé', 404);
    }
    return successResponse(res, 'Compte supprimé avec succès');
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la suppression du compte', 500);
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await CompteModel.getStats();
    return successResponse(res, 'Statistiques des comptes', stats);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la récupération des statistiques', 500);
  }
};

exports.getRegionStats = async (req, res) => {
  try {
    const stats = await CompteModel.getStatsByRegion();
    return successResponse(res, 'Statistiques par région', stats);
  } catch (error) {
    return errorResponse(res, 'Erreur lors de la récupération des statistiques', 500);
  }
};