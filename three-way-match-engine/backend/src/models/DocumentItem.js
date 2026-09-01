const mongoose = require('mongoose');

const documentItemSchema = new mongoose.Schema(
  {
    rawItemCode: { type: String, required: true, trim: true },
    skuMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'SkuMaster', default: null },
    skuName: { type: String, default: '' },
    mappedSkuName: { type: String, default: '' },
    erpCode: { type: String, default: '' },
    ean: { type: String, default: '' },
    hsn: { type: String, default: '' },
    uom: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unitRate: { type: Number, default: 0 },
    unitMrp: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    resolutionReason: { type: String, default: null },
  },
  { _id: true }
);

module.exports = documentItemSchema;
