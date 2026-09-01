const { body } = require('express-validator');

exports.validateSku = [
  body('erpCode').notEmpty().withMessage('ERP Code is required').isString(),
  body('skuName').notEmpty().withMessage('SKU Name is required').isString(),
  body('agreedRate').optional().isNumeric(),
  body('mrp').optional().isNumeric()
];
