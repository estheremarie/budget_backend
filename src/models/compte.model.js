const { pool } = require('../config/database');

class CompteModel {
  static async findAll(annee, region) {
    let query = 'SELECT * FROM comptes_budgetaires WHERE actif = true';
    const params = [];
    
    if (annee) {
      params.push(annee);
      query += ` AND annee = $${params.length}`;
    }
    
    if (region) {
      params.push(region);
      query += ` AND region = $${params.length}`;
    }
    
    query += ' ORDER BY num_compte';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM comptes_budgetaires WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { num_compte, nom_compte, credit_initial, credit_actuel, taux_global, region, annee } = data;
    const result = await pool.query(
      `INSERT INTO comptes_budgetaires 
       (num_compte, nom_compte, credit_initial, credit_actuel, taux_global, region, annee) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [num_compte, nom_compte, credit_initial, credit_actuel || 0, taux_global || 0, region || 'Haute Matsiatra', annee]
    );
    return result.rows[0];
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
}

module.exports = CompteModel;