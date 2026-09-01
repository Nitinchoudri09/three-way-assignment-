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

const grnSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, trim: true, index: true },
    grnNumber: { type: String, required: true, trim: true },
    grnDate: { type: Date, required: true },
    vendorName: { type: String, default: '' },
    items: [documentItemSchema],
    file: fileSchema,
    isDuplicate: { type: Boolean, default: false },
    duplicateReason: { type: String, default: null },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

grnSchema.index({ grnNumber: 1, poNumber: 1 });

module.exports = mongoose.model('Grn', grnSchema);
