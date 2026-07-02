const { Client } = require('pg');

// Test avec différents ports
const ports = [5432, 5433, 5434, 5435];

async function testPort(port) {
  console.log(`\n🔍 Test du port ${port}...`);
  
  const client = new Client({
    host: 'localhost',
    port: port,
    user: 'postgres',
    password: '1234',
    database: 'postgres',
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`✅ Connexion réussie sur le port ${port}!`);
    console.log(`📅 Heure: ${res.rows[0].now}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ Port ${port} échoué: ${err.message}`);
    await client.end();
    return false;
  }
}

async function runTests() {
  console.log('🔍 Recherche du port PostgreSQL...\n');
  
  let found = false;
  for (const port of ports) {
    const success = await testPort(port);
    if (success) {
      console.log(`\n✅ PostgreSQL fonctionne sur le port ${port}`);
      console.log(`👉 Utilisez DB_PORT=${port} dans .env`);
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log('\n❌ Aucun port PostgreSQL trouvé.');
    console.log('Vérifiez que PostgreSQL est bien installé et en cours d\'exécution.');
    console.log('Essayez aussi avec votre mot de passe PostgreSQL.');
  }
}

runTests();