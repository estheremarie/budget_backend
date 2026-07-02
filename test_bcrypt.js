const bcrypt = require('bcryptjs');

// Le hash stocké dans la base de données
const storedHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mr9Qp8Kq5e5gXJZQYxGx8uVeZ5g7';

// Les mots de passe à tester
const testPasswords = [
  'admin123',
  'password123',
  'admin',
  '1234',
  'password'
];

console.log('🔐 Test de comparaison bcrypt');
console.log('Hash stocké:', storedHash);
console.log('----------------------------------------\n');

// Tester chaque mot de passe
testPasswords.forEach(password => {
  bcrypt.compare(password, storedHash, (err, result) => {
    if (err) {
      console.error('❌ Erreur:', err);
    } else {
      console.log(`🔑 Mot de passe: '${password}' -> ${result ? '✅ CORRECT' : '❌ INCORRECT'}`);
    }
  });
});

// Version avec async/await
async function testAsync() {
  console.log('\n--- Test avec async/await ---\n');
  
  for (const password of testPasswords) {
    try {
      const result = await bcrypt.compare(password, storedHash);
      console.log(`🔑 Mot de passe: '${password}' -> ${result ? '✅ CORRECT' : '❌ INCORRECT'}`);
    } catch (err) {
      console.error('❌ Erreur:', err);
    }
  }
}

// Attendre un peu que les tests précédents finissent
setTimeout(() => {
  testAsync();
}, 2000);