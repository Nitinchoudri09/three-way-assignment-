const mongoose = require('mongoose');
const documentItemSchema = require('./DocumentItem');

const fileSchema = new mongoose.Schema(
  {
    originalFileName: String,
    safeFileName: String,
    filePath: String,
    mimeType: String,
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, trim: true, index: true },
    poDate: { type: Date, required: true },
    vendorName: { type: String, default: '' },
    items: [documentItemSchema],
    file: fileSchema,
    isDuplicate: { type: Boolean, default: false },
    duplicateReason: { type: String, default: null },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
