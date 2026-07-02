const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');
const config = require('../config/env');

exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return errorResponse(res, 'Token d\'authentification requis', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expiré, veuillez vous reconnecter', 401);
    }
    return errorResponse(res, 'Token invalide', 401);
  }
};