const { pool } = require('../config/database');

class TransactionModel {
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        d.id,
        d.ref_depense as ref,
        d.date_depense as date,
        d.chapitre,
        d.libelle,
        d.montant,
        d.statut,
        c.num_compte,
        c.nom_compte
      FROM depenses d
      JOIN comptes_budgetaires c ON d.compte_id = c.id
      WHERE d.statut IN ('Engagée', 'Ordonnancée', 'Payée')
    `;
    const params = [];
    let paramCount = 1;

    if (filters.chapitre) {
      params.push(filters.chapitre);
      query += ` AND d.chapitre = $${paramCount++}`;
    }
    if (filters.statut && filters.statut !== 'Tous') {
      params.push(filters.statut);
      query += ` AND d.statut = $${paramCount++}`;
    }
    if (filters.annee) {
      params.push(filters.annee);
      query += ` AND EXTRACT(YEAR FROM d.date_depense) = $${paramCount++}`;
    }
    if (filters.compte_id) {
      params.push(filters.compte_id);
      query += ` AND d.compte_id = $${paramCount++}`;
    }

    query += ' ORDER BY d.date_depense DESC LIMIT 50';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getSummary() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(montant) as total_montant,
        AVG(montant) as montant_moyen,
        MIN(date_depense) as premiere_date,
        MAX(date_depense) as derniere_date
      FROM depenses
      WHERE statut IN ('Engagée', 'Ordonnancée', 'Payée')
    `);
    return result.rows[0];
  }
}

module.exports = TransactionModel;