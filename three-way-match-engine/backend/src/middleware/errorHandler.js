const multer = require('multer');

function errorHandler(err, req, res, _next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the allowed limit.',
        code: 'FILE_TOO_LARGE',
      });
    }
  }

  if (err.message && err.message.includes('Unsupported file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    status === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Request failed';

  res.status(status).json({
    success: false,
    message,
    code: err.code || 'INTERNAL_ERROR',
  });
}

module.exports = errorHandler;
