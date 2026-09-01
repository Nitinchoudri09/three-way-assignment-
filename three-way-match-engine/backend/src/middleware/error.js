const { error } = require('../utils/response');
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.message, err);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  
  error(res, message, statusCode, 'INTERNAL_ERROR');
};
