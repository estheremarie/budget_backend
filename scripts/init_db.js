// scripts/init_db.js
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// ✅ Utilisez votre mot de passe PostgreSQL (1234)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'budget_db',
  password: '1234', // ⚠️ Changer ici
  port: 5432,
});

async function initDatabase() {
  try {
    console.log('🔐 Initialisation de la base de données...\n');

    // ✅ Les bons hash bcrypt pour "password123"
    const hashPassword123 = '$2a$10$2fc/qvKCXRtftf1mEOxn4uOyJxHcIx63uTl.mkHnhYBLfVnH5cDuW';
    const hashAdmin123 = '$2a$10$20QtZTEvAytPycBI3Yzf1.v6ePCZqnxA.frsh3qZkR0iMCQpWyHRC';

    console.log('📌 Hash pour password123:', hashPassword123);
    console.log('📌 Hash pour admin123:', hashAdmin123);
    console.log('');

    // Supprimer les utilisateurs existants
    await pool.query('TRUNCATE TABLE utilisateurs CASCADE');
    await pool.query('ALTER SEQUENCE utilisateurs_id_seq RESTART WITH 1');

    // Insérer les nouveaux utilisateurs avec les bons hash
    const users = [
      {
        username: 'chef.baf',
        password_hash: hashPassword123,
        nom: 'Rakoto',
        prenom: 'Andoniaina',
        role: 'Chef BAF',
        email: 'chef.baf@budget.mg',
      },
      {
        username: 'agent.comptable',
        password_hash: hashPassword123,
        nom: 'Rabe',
        prenom: 'Marie',
        role: 'Agent Comptable',
        email: 'agent.comptable@budget.mg',
      },
      {
        username: 'chef.srb',
        password_hash: hashPassword123,
        nom: 'Razafy',
        prenom: 'Jean',
        role: 'Chef SRB',
        email: 'chef.srb@budget.mg',
      },
      {
        username: 'admin',
        password_hash: hashAdmin123,
        nom: 'Admin',
        prenom: 'System',
        role: 'Administrateur',
        email: 'admin@budget.mg',
      },
    ];

    for (const user of users) {
      await pool.query(
        `INSERT INTO utilisateurs 
         (username, password_hash, nom, prenom, role, email, actif) 
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [user.username, user.password_hash, user.nom, user.prenom, user.role, user.email]
      );
      console.log(`✅ Utilisateur créé: ${user.username}`);
    }

    console.log('\n✅ Base de données initialisée avec succès !');
    console.log('\n🔑 Identifiants de test:');
    console.log('  chef.baf / password123');
    console.log('  agent.comptable / password123');
    console.log('  chef.srb / password123');
    console.log('  admin / admin123');

    await pool.end();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await pool.end();
    process.exit(1);
  }
}

initDatabase();