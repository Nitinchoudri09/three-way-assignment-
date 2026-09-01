const { body } = require('express-validator');

exports.validateUpload = [
  body('documentType').isIn(['purchase_order', 'grn', 'invoice']).withMessage('Invalid document type')
];
