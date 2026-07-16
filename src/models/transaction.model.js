// backend/src/models/transaction.model.js
const { pool } = require('../config/database');

class TransactionModel {
  // ✅ Initialiser la table transactions avec les colonnes manquantes
  static async initTable() {
    // Vérifier si la table existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'transactions'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Créer la table transactions selon votre structure
      await pool.query(`
        CREATE TABLE transactions (
          id SERIAL PRIMARY KEY,
          compte_id INT NOT NULL,
          montant_engager NUMERIC(7) NOT NULL CHECK (montant_engager > 0),
          montant_liquider NUMERIC(7) NOT NULL CHECK (montant_liquider > 0),
          date_transaction DATE NOT NULL DEFAULT CURRENT_DATE,
          admin_id VARCHAR(100) NOT NULL,
          num_compte VARCHAR(50),
          nom_compte VARCHAR(255),
          statut VARCHAR(50) DEFAULT 'en_attente',
          taux_engagement NUMERIC(10,2) DEFAULT 0,
          taux_execution NUMERIC(10,2) DEFAULT 0,
          taux_liquidation NUMERIC(10,2) DEFAULT 0,
          date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_transaction_compte FOREIGN KEY (compte_id) REFERENCES comptes_budgetaires(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Table transactions créée avec toutes les colonnes');
      return;
    }

    // ✅ Vérifier et ajouter les colonnes manquantes
    const columnsToCheck = [
      { name: 'num_compte', type: 'VARCHAR(50)' },
      { name: 'nom_compte', type: 'VARCHAR(255)' },
      { name: 'statut', type: 'VARCHAR(50) DEFAULT \'en_attente\'' },
      { name: 'taux_engagement', type: 'NUMERIC(10,2) DEFAULT 0' },
      { name: 'taux_execution', type: 'NUMERIC(10,2) DEFAULT 0' },
      { name: 'taux_liquidation', type: 'NUMERIC(10,2) DEFAULT 0' }
    ];

    for (const col of columnsToCheck) {
      const colCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'transactions' AND column_name = $1
        )
      `, [col.name]);
      
      if (!colCheck.rows[0].exists) {
        await pool.query(`ALTER TABLE transactions ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Colonne ${col.name} ajoutée à transactions`);
      }
    }

    console.log('✅ Table transactions vérifiée');
  }

  // ✅ Récupérer toutes les transactions
  static async findAll(filters = {}) {
    await this.initTable();

    let query = `
      SELECT 
        t.*,
        c.num_compte as compte_num,
        c.nom_compte as compte_nom,
        c.credit_actuel
      FROM transactions t
      LEFT JOIN comptes_budgetaires c ON t.compte_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.statut && filters.statut !== 'Tous') {
      params.push(filters.statut);
      query += ` AND t.statut = $${paramCount++}`;
    }
    if (filters.annee) {
      params.push(filters.annee);
      query += ` AND EXTRACT(YEAR FROM t.date_transaction) = $${paramCount++}`;
    }
    if (filters.compte_id) {
      params.push(filters.compte_id);
      query += ` AND t.compte_id = $${paramCount++}`;
    }

    query += ' ORDER BY t.date_transaction DESC LIMIT 50';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // ✅ Récupérer le résumé des transactions
  static async getSummary() {
    await this.initTable();

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(montant_engager), 0) as total_engagements,
        COALESCE(SUM(montant_liquider), 0) as total_liquidations,
        COALESCE(AVG(montant_engager), 0) as montant_moyen,
        MIN(date_transaction) as premiere_date,
        MAX(date_transaction) as derniere_date
      FROM transactions
    `);
    return result.rows[0];
  }

  // ✅ Créer une transaction
  static async create(data) {
    await this.initTable();

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
    } = data;

    // Vérifier que le compte existe
    const compteCheck = await pool.query(
      'SELECT id, credit_actuel, credit_initial FROM comptes_budgetaires WHERE id = $1',
      [compte_id]
    );

    if (compteCheck.rows.length === 0) {
      throw new Error('Compte non trouvé');
    }

    const compte = compteCheck.rows[0];
    const montantEngager = parseFloat(montant_engager) || 0;
    const montantLiquider = parseFloat(montant_liquider) || 0;

    // Vérifier que le montant à liquider ne dépasse pas le crédit actuel
    if (montantLiquider > parseFloat(compte.credit_actuel)) {
      throw new Error('Le montant à liquider dépasse le crédit disponible');
    }

    // Insérer la transaction avec toutes les colonnes
    const result = await pool.query(
      `INSERT INTO transactions 
       (compte_id, num_compte, nom_compte, montant_engager, montant_liquider, 
        date_transaction, statut, admin_id, taux_engagement, taux_execution, taux_liquidation) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        compte_id, 
        num_compte || '', 
        nom_compte || '', 
        montantEngager, 
        montantLiquider, 
        date_transaction || new Date().toISOString().split('T')[0], 
        statut || 'approuve', 
        admin_id || 'admin',
        parseFloat(taux_engagement) || 0,
        parseFloat(taux_execution) || 0,
        parseFloat(taux_liquidation) || 0
      ]
    );

    const transaction = result.rows[0];

    // ✅ Mettre à jour les crédits du compte (SANS date_modification)
    await pool.query(
      `UPDATE comptes_budgetaires 
       SET credit_actuel = credit_actuel - $2, 
           credit_consomme = COALESCE(credit_consomme, 0) + $2
       WHERE id = $1`,
      [compte_id, montantLiquider]
    );

    return transaction;
  }

  // ✅ Récupérer les demandes de transaction
  static async getDemandes(statut = null) {
    // Vérifier si la table demande_transaction existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'demande_transaction'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      await pool.query(`
        CREATE TABLE demande_transaction (
          id SERIAL PRIMARY KEY,
          compte_id INT NOT NULL,
          comptable_email VARCHAR(30) NOT NULL,
          montant_engagement NUMERIC(7) NOT NULL CHECK (montant_engagement > 0),
          montant_liquidation NUMERIC(7) NOT NULL CHECK (montant_liquidation > 0),
          date_transaction DATE DEFAULT CURRENT_DATE,
          statut VARCHAR(15) CHECK (statut IN ('approuve', 'refuse', 'en_attente')),
          admin_email VARCHAR(30),
          taux_engagement NUMERIC(3) CHECK (taux_engagement >= 0 AND taux_engagement <= 100),
          taux_execution NUMERIC(3) CHECK (taux_execution >= 0 AND taux_execution <= 100),
          taux_liquidation NUMERIC(3) CHECK (taux_liquidation >= 0 AND taux_liquidation <= 100),
          date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_demande_transaction_compte FOREIGN KEY (compte_id) REFERENCES comptes_budgetaires(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Table demande_transaction créée');
    }

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

  // ✅ Créer une demande de transaction
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

  // ✅ Approuver une demande de transaction
  static async approuverDemande(id, admin_email) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const demandeResult = await client.query(
        'SELECT * FROM demande_transaction WHERE id = $1',
        [id]
      );

      if (demandeResult.rows.length === 0) {
        throw new Error('Demande non trouvée');
      }

      const demande = demandeResult.rows[0];

      const updateResult = await client.query(
        `UPDATE demande_transaction 
         SET statut = 'approuve', admin_email = $2, date_modification = CURRENT_TIMESTAMP 
         WHERE id = $1 RETURNING *`,
        [id, admin_email]
      );

      // Récupérer les infos du compte
      const compteInfo = await client.query(
        'SELECT num_compte, nom_compte FROM comptes_budgetaires WHERE id = $1',
        [demande.compte_id]
      );

      await client.query(
        `INSERT INTO transactions 
         (compte_id, num_compte, nom_compte, montant_engager, montant_liquider, 
          date_transaction, statut, admin_id, taux_engagement, taux_execution, taux_liquidation) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          demande.compte_id,
          compteInfo.rows[0]?.num_compte || '',
          compteInfo.rows[0]?.nom_compte || '',
          demande.montant_engagement,
          demande.montant_liquidation,
          new Date(),
          'approuve',
          admin_email,
          demande.taux_engagement || 0,
          demande.taux_execution || 0,
          demande.taux_liquidation || 0
        ]
      );

      // ✅ Mettre à jour les crédits (SANS date_modification)
      await client.query(
        `UPDATE comptes_budgetaires 
         SET credit_actuel = credit_actuel - $2, 
             credit_consomme = COALESCE(credit_consomme, 0) + $2
         WHERE id = $1`,
        [demande.compte_id, demande.montant_liquidation]
      );

      await client.query(
        `INSERT INTO notifications (email, etat, message, type, lien) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          demande.comptable_email,
          false,
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

  // ✅ Refuser une demande de transaction
  static async refuserDemande(id, admin_email) {
    const result = await pool.query(
      `UPDATE demande_transaction 
       SET statut = 'refuse', admin_email = $2, date_modification = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [id, admin_email]
    );

    if (result.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (email, etat, message, type, lien) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          result.rows[0].comptable_email,
          false,
          `Votre demande de transaction a été refusée`,
          'danger',
          '/transactions'
        ]
      );
    }

    return result.rows[0];
  }

  // ✅ Récupérer les notifications non lues
  static async getNotifications(email) {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE email = $1 AND etat = false 
       ORDER BY date_creation DESC`,
      [email]
    );
    return result.rows;
  }

  // ✅ Marquer une notification comme lue
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

// ✅ Fonction utilitaire pour parser les nombres
function parseFloat(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

module.exports = TransactionModel;