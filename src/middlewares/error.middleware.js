const { errorResponse } = require('../utils/response');

exports.errorHandler = (err, req, res, next) => {
  console.error('❌ Erreur:', err.stack);
  
  if (err.type === 'validation') {
    return errorResponse(res, err.message, 400, err.errors);
  }
  
  return errorResponse(res, err.message || 'Erreur interne du serveur', err.status || 500);
};