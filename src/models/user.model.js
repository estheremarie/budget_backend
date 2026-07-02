const { pool } = require('../config/database');
// ⚠️ TEMPORAIRE - On n'utilise pas bcrypt pour le moment
// const bcrypt = require('bcryptjs');

class UserModel {
  static async findByUsername(username) {
    console.log(`🔍 Recherche: ${username}`);
    const result = await pool.query(
      'SELECT * FROM utilisateurs WHERE username = $1 AND actif = true',
      [username]
    );
    if (result.rows.length > 0) {
      console.log(`✅ Utilisateur trouvé: ${username}`);
    } else {
      console.log(`❌ Utilisateur non trouvé: ${username}`);
    }
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT id, username, nom, prenom, role, email FROM utilisateurs WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // 🔧 COMPARAISON DIRECTE (sans bcrypt)
  static async comparePassword(password, hash) {
    console.log(`🔐 Comparaison: '${password}' avec '${hash}'`);
    const result = password === hash;
    console.log(`✅ Résultat: ${result}`);
    return result;
  }

  static async hashPassword(password) {
    // Retourne le mot de passe en clair
    return password;
  }
}

module.exports = UserModel;