// server.js
const app = require('./src/app');
const config = require('./src/config/env');
const { pool } = require('./src/config/database');

const PORT = config.port || 3000;
const HOST = '0.0.0.0'; // ✅ Écouter sur toutes les interfaces

// Fonction pour obtenir l'IP locale
function getLocalIp() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Vérifier si c'est IPv4 et pas loopback
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  
  // Prioriser l'IP WiFi/Ethernet (192.168.x.x, 10.x.x.x, 172.x.x.x)
  const preferredIp = ips.find(ip => 
    ip.startsWith('192.168.') || 
    ip.startsWith('10.') || 
    ip.startsWith('172.')
  );
  return preferredIp || ips[0] || 'localhost';
}

// Fonction pour obtenir toutes les IPs
function getAllIps() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({
          interface: name,
          address: net.address
        });
      }
    }
  }
  return ips;
}

// ✅ Route de vérification de santé (Health Check)
// Cette route est également définie dans app.js, mais on ajoute une vérification supplémentaire
function setupHealthCheck() {
  // Ajouter une route de santé pour vérifier la base de données
  app.get('/api/health/db', async (req, res) => {
    try {
      const startTime = Date.now();
      const result = await pool.query('SELECT NOW() as time, 1 as status');
      const endTime = Date.now();
      
      res.json({
        status: 'OK',
        database: 'connected',
        responseTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
        dbTime: result.rows[0].time,
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(503).json({
        status: 'ERROR',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ✅ Route de santé complète
  app.get('/api/health/full', async (req, res) => {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: config.nodeEnv || 'development',
      services: {
        server: {
          status: 'running',
          port: PORT,
          host: HOST
        },
        database: {
          status: 'checking',
          connected: false
        },
        cors: {
          enabled: true,
          origin: '*'
        }
      }
    };

    try {
      // Vérifier la base de données
      await pool.query('SELECT 1 as connected');
      health.services.database.status = 'connected';
      health.services.database.connected = true;
    } catch (error) {
      health.status = 'DEGRADED';
      health.services.database.status = 'disconnected';
      health.services.database.connected = false;
      health.services.database.error = error.message;
    }

    res.json(health);
  });

  console.log('✅ Routes de santé ajoutées: /api/health, /api/health/db, /api/health/full');
}

// Vérifier la connexion à la base de données avant de démarrer
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erreur de connexion à la base de données:', err.message);
    console.log('\n📋 Vérifiez vos identifiants dans le fichier .env');
    console.log('🔑 DB_USER=postgres');
    console.log('🔑 DB_PASSWORD=1234');
    console.log('🔑 DB_NAME=budget_db');
    console.log('🔑 DB_HOST=localhost');
    console.log('🔑 DB_PORT=5432');
    process.exit(1);
  }
  
  console.log('✅ Base de données connectée');
  
  // ✅ Configurer les routes de santé
  setupHealthCheck();
  
  // Obtenir l'IP locale
  const localIp = getLocalIp();
  const allIps = getAllIps();
  
  // Démarrer le serveur sur toutes les interfaces
  const server = app.listen(PORT, HOST, () => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📡 URLs disponibles :`);
    console.log(`   ➜ Localhost     : http://localhost:${PORT}`);
    console.log(`   ➜ API           : http://localhost:${PORT}/api`);
    console.log(`   ➜ Réseau local  : http://${localIp}:${PORT}`);
    console.log('───────────────────────────────────────────────────────────────');
    
    // Afficher toutes les IPs disponibles
    if (allIps.length > 1) {
      console.log('🌐 Toutes les IPs disponibles :');
      allIps.forEach(ip => {
        console.log(`   ➜ ${ip.interface.padEnd(15)} : http://${ip.address}:${PORT}`);
      });
      console.log('───────────────────────────────────────────────────────────────');
    }
    
    console.log(`📊 Environnement  : ${config.nodeEnv || 'development'}`);
    console.log(`🗄️  Base de données : PostgreSQL (${config.dbName || 'budget_db'})`);
    console.log(`📡 IP principale   : ${localIp}`);
    console.log(`🔌 Port           : ${PORT}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('✅ Routes de santé :');
    console.log(`   ➜ Health check   : http://localhost:${PORT}/api/health`);
    console.log(`   ➜ DB Health      : http://localhost:${PORT}/api/health/db`);
    console.log(`   ➜ Full Health    : http://localhost:${PORT}/api/health/full`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 Appuyez sur Ctrl+C pour arrêter le serveur');
    console.log('📝 Pour redémarrer, tapez "rs" et Entrée');
    console.log('');
  });
});

// Gestion de l'arrêt du serveur
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur en cours...');
  pool.end(() => {
    console.log('✅ Connexions PostgreSQL fermées');
    console.log('👋 Serveur arrêté');
    process.exit(0);
  });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error.message);
  console.error('📚 Stack trace:', error.stack);
  // Ne pas quitter immédiatement, laisser le serveur gérer
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});

// Gestion des signaux d'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt du serveur...');
  server.close(() => {
    pool.end(() => {
      console.log('✅ Connexions PostgreSQL fermées');
      console.log('👋 Serveur arrêté');
      process.exit(0);
    });
  });
});

console.log('✅ Serveur prêt à recevoir des requêtes');