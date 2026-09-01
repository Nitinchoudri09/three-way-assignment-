const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

module.exports = (req, res, next) => {
  // Accept token from Authorization header OR query param (for iframe/img file previews)
  const authHeader = req.header('Authorization');
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
  
  if (!token) {
    return error(res, 'Access denied. No token provided.', 401, 'UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    req.user = decoded;
    next();
  } catch (ex) {
    error(res, 'Invalid token.', 401, 'INVALID_TOKEN');
  }
};
