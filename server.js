const app = require('./src/app');
const config = require('./src/config/env');
const { pool } = require('./src/config/database');

const PORT = config.port || 3000;

// Vérifier la connexion à la base de données avant de démarrer
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erreur de connexion à la base de données:', err.message);
    console.log('\n📋 Vérifiez vos identifiants dans le fichier .env');
    console.log('🔑 DB_USER=postgres');
    console.log('🔑 DB_PASSWORD=le_mot_de_passe_que_vous_avez_défini');
    console.log('🔑 DB_NAME=budget_db');
    process.exit(1);
  }
  
  console.log('✅ Base de données connectée');
  
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📊 Environnement: ${config.nodeEnv}`);
    console.log(`📡 Accessible depuis le réseau sur http://192.168.88.16:${PORT}`);
  });
});

// Gestion de l'arrêt du serveur
process.on('SIGINT', () => {
  console.log('🛑 Arrêt du serveur...');
  pool.end(() => {
    console.log('✅ Connexions PostgreSQL fermées');
    process.exit(0);
  });
});