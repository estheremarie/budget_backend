const bcrypt = require('bcryptjs');

async function generate() {
  const users = [
    { username: 'chef.baf', password: 'password123', nom: 'Rakoto', prenom: 'Andoniaina', role: 'Chef BAF', email: 'chef.baf@budget.mg' },
    { username: 'agent.comptable', password: 'password123', nom: 'Rabe', prenom: 'Marie', role: 'Agent Comptable', email: 'agent.comptable@budget.mg' },
    { username: 'chef.srb', password: 'password123', nom: 'Razafy', prenom: 'Jean', role: 'Chef SRB', email: 'chef.srb@budget.mg' },
    { username: 'admin', password: 'admin123', nom: 'Admin', prenom: 'System', role: 'Administrateur', email: 'admin@budget.mg' }
  ];
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔐 GÉNÉRATION DES HASH BCRYPT');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📌 1. Commandes UPDATE pour mettre à jour les mots de passe\n');
  
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    console.log(`-- ${user.username} (${user.password}) -> ${hash.substring(0, 30)}...`);
    console.log(`UPDATE utilisateurs SET password_hash = '${hash}' WHERE username = '${user.username}';`);
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📌 2. Commandes INSERT complètes (reset complet)\n');
  
  // Afficher les INSERT complets avec les hash
  console.log("-- =====================================================");
  console.log("-- RÉINSERTION DES UTILISATEURS AVEC HASH BCRYPT");
  console.log("-- =====================================================\n");
  
  console.log("TRUNCATE TABLE utilisateurs CASCADE;");
  console.log("ALTER SEQUENCE utilisateurs_id_seq RESTART WITH 1;\n");
  
  console.log("INSERT INTO utilisateurs (username, password_hash, nom, prenom, role, email, actif) VALUES");
  
  const values = [];
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    values.push(
      `('${user.username}', '${hash}', '${user.nom}', '${user.prenom}', '${user.role}', '${user.email}', true)`
    );
  }
  console.log(values.join(',\n') + ';');
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📌 3. Vérification\n');
  
  console.log("-- Vérifier les utilisateurs");
  console.log("SELECT id, username, nom, prenom, role, email, actif FROM utilisateurs;");
  console.log("");
  console.log("-- Vérifier un utilisateur spécifique");
  console.log("SELECT id, username, password_hash FROM utilisateurs WHERE username = 'chef.baf';");
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔑 IDENTIFIANTS DE TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('┌─────────────────┬──────────────┬──────────────────────┐');
  console.log('│ Utilisateur     │ Mot de passe │ Rôle                 │');
  console.log('├─────────────────┼──────────────┼──────────────────────┤');
  for (const user of users) {
    const rolePadded = user.role.padEnd(20);
    console.log(`│ ${user.username.padEnd(15)} │ ${user.password.padEnd(12)} │ ${rolePadded} │`);
  }
  console.log('└─────────────────┴──────────────┴──────────────────────┘');
  
  console.log('\n✅ Génération terminée !');
  console.log('📋 Copiez les commandes ci-dessus dans pgAdmin ou psql.\n');
}

// Exécuter la génération
generate().catch(console.error);