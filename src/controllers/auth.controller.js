// backend/src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'budget_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Configuration de l'envoi d'email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'votre.email@gmail.com',
    pass: process.env.EMAIL_PASS || 'votre_mot_de_passe_app',
  },
});

// =====================================================
// LOGIN
// =====================================================
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id, username, email, password_hash, nom, prenom, role FROM utilisateurs WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects',
      });
    }

    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects',
      });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'votre_secret_jwt',
      { expiresIn: '24h' }
    );

    // ✅ STRUCTURE DE RÉPONSE SIMPLIFIÉE (sans "data")
    res.status(200).json({
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        fullName: `${user.prenom} ${user.nom}`,
      },
    });

  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

// =====================================================
// ME (Get user info)
// =====================================================
const me = async (req, res) => {
  try {
    const userId = req.userId;

    const userResult = await pool.query(
      'SELECT id, username, email, nom, prenom, role FROM utilisateurs WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    const user = userResult.rows[0];
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        fullName: `${user.prenom} ${user.nom}`,
      },
    });

  } catch (error) {
    console.error('❌ Erreur me:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
    });
  }
};

// =====================================================
// FORGOT PASSWORD
// =====================================================
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id, username, email FROM utilisateurs WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé avec cet email',
      });
    }

    const user = userResult.rows[0];

    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'votre_secret_jwt',
      { expiresIn: '24h' }
    );

    await pool.query(
      'UPDATE utilisateurs SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'24 hours\' WHERE id = $2',
      [resetToken, user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔗 LIEN DE RÉINITIALISATION (MODE DÉVELOPPEMENT)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`👤 Utilisateur: ${user.username}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔗 Lien: ${resetLink}`);
    console.log(`⏳ Valable 24h`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return res.status(200).json({
      success: true,
      message: 'Lien de réinitialisation généré (mode développement)',
      resetLink: resetLink,
      token: resetToken,
      user: {
        username: user.username,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('❌ Erreur forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la génération du lien',
    });
  }
};

// =====================================================
// RESET PASSWORD
// =====================================================
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré',
      });
    }

    const userResult = await pool.query(
      'SELECT id FROM utilisateurs WHERE id = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [decoded.userId, token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE utilisateurs SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, decoded.userId]
    );

    res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });

  } catch (error) {
    console.error('❌ Erreur resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation',
    });
  }
};

module.exports = {
  login,
  me,
  forgotPassword,
  resetPassword,
};

// ✅ NOUVEAU : Envoyer un code de récupération à 6 chiffres
const sendRecoveryCode = async (req, res) => {
  const { email } = req.body;

  try {
    // Vérifier si l'email existe
    const userResult = await pool.query(
      'SELECT id, username, email FROM utilisateurs WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé avec cet email',
      });
    }

    const user = userResult.rows[0];

    // Générer un code à 6 chiffres
    const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Sauvegarder le code dans la base de données (expiration 15 minutes)
    await pool.query(
      'UPDATE utilisateurs SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'15 minutes\' WHERE id = $2',
      [recoveryCode, user.id]
    );

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔐 CODE DE RÉCUPÉRATION (MODE DÉVELOPPEMENT)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`👤 Utilisateur: ${user.username}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔢 Code: ${recoveryCode}`);
    console.log(`⏳ Valable 15 minutes`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // ✅ En développement, retourner le code dans la réponse
    return res.status(200).json({
      success: true,
      message: 'Code de récupération généré (mode développement)',
      data: {
        code: recoveryCode, // Pour le développement uniquement
        user: {
          username: user.username,
          email: user.email,
        },
      },
    });

  } catch (error) {
    console.error('❌ Erreur sendRecoveryCode:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la génération du code',
    });
  }
};

// ✅ NOUVEAU : Réinitialiser avec code
const resetWithCode = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    // Vérifier si le code correspond
    const userResult = await pool.query(
      'SELECT id FROM utilisateurs WHERE email = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [email, code]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Code invalide ou expiré',
      });
    }

    const user = userResult.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et effacer le code
    await pool.query(
      'UPDATE utilisateurs SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });

  } catch (error) {
    console.error('❌ Erreur resetWithCode:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation',
    });
  }
};

// ✅ Ajouter dans module.exports
module.exports = {
  login,
  me,
  forgotPassword,
  resetPassword,
  sendRecoveryCode,
  resetWithCode,
};