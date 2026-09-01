const SkuMaster = require('../models/SkuMaster');
const { success, error } = require('../utils/response');
const { validationResult } = require('express-validator');

exports.listSkus = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { erpCode: new RegExp(search, 'i') },
          { skuName: new RegExp(search, 'i') }
        ]
      };
    }
    const skus = await SkuMaster.find(query);
    success(res, skus);
  } catch (err) {
    next(err);
  }
};

exports.createSku = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, errors.array()[0].msg, 400);

    const sku = await SkuMaster.create(req.body);
    success(res, sku, 201);
  } catch (err) {
    next(err);
  }
};

exports.updateSku = async (req, res, next) => {
  try {
    const sku = await SkuMaster.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sku) return error(res, 'SKU not found', 404);
    success(res, sku);
  } catch (err) {
    next(err);
  }
};

exports.deleteSku = async (req, res, next) => {
  try {
    const sku = await SkuMaster.findByIdAndDelete(req.params.id);
    if (!sku) return error(res, 'SKU not found', 404);
    success(res, { message: 'SKU deleted successfully' });
  } catch (err) {
    next(err);
  }
};
