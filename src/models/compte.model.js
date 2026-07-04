// backend/src/models/compte.model.js
const { pool } = require('../config/database');

class CompteModel {
  static async findAll(annee, region) {
    let query = `
      SELECT 
        c.*,
        ca.credit_initial as credit_annuel_initial,
        ca.credit_actuel as credit_annuel_actuel,
        (
          SELECT json_agg(r.*) 
          FROM regulations r 
          WHERE r.num_compte = c.num_compte 
          AND r.annee = $1
        ) as regulations
      FROM comptes_budgetaires c
      LEFT JOIN credits_annuels ca ON c.num_compte = ca.num_compte AND ca.annee = $1
      WHERE c.actif = true
    `;
    const params = [annee || '2025'];
    let paramCount = 2;

    if (region) {
      params.push(region);
      query += ` AND c.region = $${paramCount++}`;
    }

    query += ' ORDER BY c.num_compte';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT 
        c.*,
        ca.credit_initial as credit_annuel_initial,
        ca.credit_actuel as credit_annuel_actuel,
        (
          SELECT json_agg(r.*) 
          FROM regulations r 
          WHERE r.num_compte = c.num_compte
        ) as regulations,
        (
          SELECT json_agg(t.*) 
          FROM transactions t 
          WHERE t.compte_id = c.id
          ORDER BY t.date_transaction DESC
          LIMIT 10
        ) as transactions_recentes
      FROM comptes_budgetaires c
      LEFT JOIN credits_annuels ca ON c.num_compte = ca.num_compte AND ca.annee = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE c.id = $1 AND c.actif = true`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { num_compte, nom_compte, credit_initial, credit_actuel, region, annee } = data;

      // ✅ Calcul automatique
      const creditActuel = credit_actuel || 0;
      const creditConsomme = credit_initial - creditActuel;
      const tauxGlobal = credit_initial > 0 
        ? parseFloat(((creditConsomme / credit_initial) * 100).toFixed(2))
        : 0;

      // Créer le compte
      const result = await client.query(
        `INSERT INTO comptes_budgetaires 
         (num_compte, nom_compte, credit_initial, credit_actuel, credit_consomme, taux_global, region, annee) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [num_compte, nom_compte, credit_initial, creditActuel, creditConsomme, tauxGlobal, region || 'Haute Matsiatra', annee]
      );

      const compte = result.rows[0];

      // Créer les crédits annuels
      await client.query(
        `INSERT INTO credits_annuels (num_compte, annee, credit_initial, credit_actuel) 
         VALUES ($1, $2, $3, $4)`,
        [num_compte, parseInt(annee), credit_initial, creditActuel]
      );

      // ✅ Calcul automatique des régulations par trimestre
      const trimestres = [
        { trimestre: 1, facteur: 0.25 },
        { trimestre: 2, facteur: 0.50 },
        { trimestre: 3, facteur: 0.75 },
        { trimestre: 4, facteur: 1.00 }
      ];

      for (const t of trimestres) {
        const tauxTrimestre = credit_initial > 0 
          ? parseFloat(((creditConsomme * t.facteur / credit_initial) * 100).toFixed(2))
          : 0;

        await client.query(
          `INSERT INTO regulations (num_compte, annee, trimestre, taux_regulation) 
           VALUES ($1, $2, $3, $4)`,
          [num_compte, parseInt(annee), t.trimestre, tauxTrimestre]
        );
      }

      await client.query('COMMIT');
      return compte;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.nom_compte !== undefined) {
      fields.push(`nom_compte = $${paramCount++}`);
      values.push(data.nom_compte);
    }
    if (data.credit_initial !== undefined) {
      fields.push(`credit_initial = $${paramCount++}`);
      values.push(data.credit_initial);
    }
    if (data.credit_actuel !== undefined) {
      fields.push(`credit_actuel = $${paramCount++}`);
      values.push(data.credit_actuel);
    }
    if (data.taux_global !== undefined) {
      fields.push(`taux_global = $${paramCount++}`);
      values.push(data.taux_global);
    }
    if (data.credit_consomme !== undefined) {
      fields.push(`credit_consomme = $${paramCount++}`);
      values.push(data.credit_consomme);
    }

    values.push(id);
    const query = `UPDATE comptes_budgetaires SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(credit_initial) as total_credit,
        SUM(credit_consomme) as total_consomme,
        AVG(taux_global) as taux_moyen
      FROM comptes_budgetaires
      WHERE actif = true
    `);
    return result.rows[0];
  }

  static async getStatsByRegion() {
    const result = await pool.query(`
      SELECT 
        region,
        COUNT(*) as total_comptes,
        SUM(credit_initial) as total_credit,
        AVG(taux_global) as taux_moyen
      FROM comptes_budgetaires
      WHERE actif = true
      GROUP BY region
      ORDER BY total_credit DESC
    `);
    return result.rows;
  }

  static async delete(id) {
    const result = await pool.query(
      'UPDATE comptes_budgetaires SET actif = false WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // ✅ NOUVEAU : Récupérer les régulations d'un compte
  static async getRegulations(num_compte, annee) {
    const result = await pool.query(
      `SELECT * FROM regulations 
       WHERE num_compte = $1 AND annee = $2 
       ORDER BY trimestre`,
      [num_compte, annee]
    );
    return result.rows;
  }

  // ✅ NOUVEAU : Mettre à jour une régulation
  static async updateRegulation(num_compte, annee, trimestre, taux_regulation) {
    const result = await pool.query(
      `INSERT INTO regulations (num_compte, annee, trimestre, taux_regulation) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (num_compte, annee, trimestre) 
       DO UPDATE SET taux_regulation = $4, date_modification = CURRENT_TIMESTAMP 
       RETURNING *`,
      [num_compte, annee, trimestre, taux_regulation]
    );
    return result.rows[0];
  }

  // ✅ NOUVEAU : Mettre à jour les régulations automatiquement
  static async updateRegulationsAuto(num_compte, annee) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const compteResult = await client.query(
        `SELECT credit_initial, credit_actuel FROM comptes_budgetaires 
         WHERE num_compte = $1 AND annee = $2`,
        [num_compte, annee]
      );

      if (compteResult.rows.length === 0) {
        throw new Error('Compte non trouvé');
      }

      const { credit_initial, credit_actuel } = compteResult.rows[0];
      const creditConsomme = credit_initial - credit_actuel;

      const trimestres = [
        { trimestre: 1, facteur: 0.25 },
        { trimestre: 2, facteur: 0.50 },
        { trimestre: 3, facteur: 0.75 },
        { trimestre: 4, facteur: 1.00 }
      ];

      for (const t of trimestres) {
        const tauxTrimestre = credit_initial > 0 
          ? parseFloat(((creditConsomme * t.facteur / credit_initial) * 100).toFixed(2))
          : 0;

        await client.query(
          `INSERT INTO regulations (num_compte, annee, trimestre, taux_regulation) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (num_compte, annee, trimestre) 
           DO UPDATE SET taux_regulation = $4, date_modification = CURRENT_TIMESTAMP`,
          [num_compte, annee, t.trimestre, tauxTrimestre]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ NOUVEAU : Récupérer les crédits annuels
  static async getCreditsAnnules(num_compte, annee) {
    const result = await pool.query(
      `SELECT * FROM credits_annuels 
       WHERE num_compte = $1 AND annee = $2`,
      [num_compte, annee]
    );
    return result.rows[0];
  }

  // ✅ NOUVEAU : Mettre à jour les crédits annuels
  static async updateCreditsAnnules(num_compte, annee, credit_initial, credit_actuel) {
    const result = await pool.query(
      `INSERT INTO credits_annuels (num_compte, annee, credit_initial, credit_actuel) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (num_compte, annee) 
       DO UPDATE SET credit_initial = $3, credit_actuel = $4, date_modification = CURRENT_TIMESTAMP 
       RETURNING *`,
      [num_compte, annee, credit_initial, credit_actuel]
    );
    return result.rows[0];
  }
}

module.exports = CompteModel;