// backend/src/config/email.config.js
const nodemailer = require('nodemailer');

// ✅ Configuration du service d'email
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Pour Outlook
    // service: 'outlook',
    // auth: {
    //   user: process.env.EMAIL_USER,
    //   pass: process.env.EMAIL_PASS,
    // },
    
    // Pour SMTP personnalisé
    // host: process.env.SMTP_HOST,
    // port: process.env.SMTP_PORT,
    // secure: true,
    // auth: {
    //   user: process.env.EMAIL_USER,
    //   pass: process.env.EMAIL_PASS,
    // },
  });
};

// ✅ Fonction pour envoyer un email
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Template d'email de réinitialisation
const getResetPasswordTemplate = (username, resetLink) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0B6E4F; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">SERVICE RÉGIONAL DU BUDGET</h1>
        <p style="color: #FFD700; margin: 5px 0;">Système d'Exécution Budgétaire</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #0B6E4F;">🔑 Réinitialisation du mot de passe</h2>
        
        <p>Bonjour <strong>${username}</strong>,</p>
        
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #0B6E4F; 
                    color: white; 
                    padding: 14px 40px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold;
                    display: inline-block;">
            🔑 Réinitialiser mon mot de passe
          </a>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-size: 14px; color: #856404;">
            ⏳ Ce lien est valable <strong>24 heures</strong>.
          </p>
        </div>
        
        <hr style="margin: 20px 0; border: 1px solid #e9ecef;">
        
        <div style="text-align: center; color: #6c757d; font-size: 12px;">
          <p>RÉPUBLIQUE DE MADAGASCAR</p>
          <p>Ministère de l'Économie et des Finances</p>
          <p>© 2025 - Système d'Exécution Budgétaire</p>
        </div>
      </div>
    </div>
  `;
};

module.exports = {
  createTransporter,
  sendEmail,
  getResetPasswordTemplate,
};