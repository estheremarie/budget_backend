// backend/src/models/transaction.model.js
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
        c.nom_compte,
        t.id as transaction_id,
        t.montant_engager,
        t.montant_liquider,
        t.date_transaction,
        t.admin_id,
        dt.id as demande_id,
        dt.comptable_email,
        dt.montant_engagement,
        dt.montant_liquidation,
        dt.taux_engagement,
        dt.taux_execution,
        dt.taux_liquidation,
        dt.statut as demande_statut
      FROM depenses d
      JOIN comptes_budgetaires c ON d.compte_id = c.id
      LEFT JOIN transactions t ON t.compte_id = c.id
      LEFT JOIN demande_transaction dt ON dt.compte_id = c.id
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

  // ✅ NOUVEAU : Récupérer les demandes de transaction
  static async getDemandes(statut = null) {
    let query = `
      SELECT 
        dt.*,
        c.num_compte,
        c.nom_compte,
        c.credit_actuel
      FROM demande_transaction dt
      JOIN comptes_budgetaires c ON dt.compte_id = c.id
    `;
    const params = [];
    let paramCount = 1;

    if (statut) {
      params.push(statut);
      query += ` WHERE dt.statut = $${paramCount++}`;
    }

    query += ' ORDER BY dt.date_creation DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // ✅ NOUVEAU : Créer une demande de transaction
  static async createDemande(data) {
    const { compte_id, comptable_email, montant_engagement, montant_liquidation, date_transaction, admin_email } = data;

    const result = await pool.query(
      `INSERT INTO demande_transaction 
       (compte_id, comptable_email, montant_engagement, montant_liquidation, date_transaction, statut, admin_email) 
       VALUES ($1, $2, $3, $4, $5, 'en_attente', $6) RETURNING *`,
      [compte_id, comptable_email, montant_engagement, montant_liquidation, date_transaction || new Date(), admin_email]
    );
    return result.rows[0];
  }

  // ✅ NOUVEAU : Approuver une demande de transaction
  static async approuverDemande(id, admin_email) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Récupérer la demande
      const demandeResult = await client.query(
        'SELECT * FROM demande_transaction WHERE id = $1',
        [id]
      );

      if (demandeResult.rows.length === 0) {
        throw new Error('Demande non trouvée');
      }

      const demande = demandeResult.rows[0];

      // Mettre à jour la demande
      const updateResult = await client.query(
        `UPDATE demande_transaction 
         SET statut = 'approuve', admin_email = $2, date_modification = CURRENT_TIMESTAMP 
         WHERE id = $1 RETURNING *`,
        [id, admin_email]
      );

      // Créer la transaction
      await client.query(
        `INSERT INTO transactions 
         (compte_id, montant_engager, montant_liquider, date_transaction, admin_id) 
         VALUES ($1, $2, $3, $4, $5)`,
        [demande.compte_id, demande.montant_engagement, demande.montant_liquidation, new Date(), admin_email]
      );

      // Mettre à jour les crédits
      await client.query(
        `UPDATE comptes_budgetaires 
         SET credit_actuel = credit_actuel - $2, 
             credit_consomme = credit_consomme + $2,
             date_modification = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [demande.compte_id, demande.montant_liquidation]
      );

      // Créer une notification
      await client.query(
        `INSERT INTO notifications (email, message, type, lien) 
         VALUES ($1, $2, $3, $4)`,
        [
          demande.comptable_email,
          `Votre demande de transaction a été approuvée (${demande.montant_engagement} Ar)`,
          'success',
          '/transactions'
        ]
      );

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ NOUVEAU : Refuser une demande de transaction
  static async refuserDemande(id, admin_email) {
    const result = await pool.query(
      `UPDATE demande_transaction 
       SET statut = 'refuse', admin_email = $2, date_modification = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [id, admin_email]
    );

    if (result.rows.length > 0) {
      // Créer une notification
      await pool.query(
        `INSERT INTO notifications (email, message, type, lien) 
         VALUES ($1, $2, $3, $4)`,
        [
          result.rows[0].comptable_email,
          `Votre demande de transaction a été refusée`,
          'danger',
          '/transactions'
        ]
      );
    }

    return result.rows[0];
  }

  // ✅ NOUVEAU : Récupérer les notifications non lues
  static async getNotifications(email) {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE email = $1 AND etat = false 
       ORDER BY date_creation DESC`,
      [email]
    );
    return result.rows;
  }

  // ✅ NOUVEAU : Marquer une notification comme lue
  static async marquerNotificationLue(id) {
    const result = await pool.query(
      `UPDATE notifications 
       SET etat = true, date_lecture = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = TransactionModel;