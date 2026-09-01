const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/response');

exports.login = (req, res) => {
  const { username, password } = req.body;
  
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUser && password === adminPass) {
    const token = jwt.sign({ username, role: 'admin' }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
    
    return success(res, {
      token,
      user: { username, role: 'admin' }
    });
  }

  return error(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
};
