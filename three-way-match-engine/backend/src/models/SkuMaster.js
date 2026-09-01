const mongoose = require('mongoose');

const skuMasterSchema = new mongoose.Schema({
  erpCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  skuName: {
    type: String,
    required: true,
    trim: true
  },
  eanCode: {
    type: String,
    trim: true,
    default: ''
  },
  hsnCode: {
    type: String,
    trim: true,
    default: ''
  },
  uom: {
    type: String,
    trim: true,
    default: 'PCS'
  },
  agreedRate: {
    type: Number,
    default: 0
  },
  mrp: {
    type: Number,
    default: 0
  },
  priceTolerance: {
    type: Number,
    default: 0.05
  }
}, { timestamps: true });

module.exports = mongoose.model('SkuMaster', skuMasterSchema);
