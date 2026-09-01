const mongoose = require('mongoose');

const commonOptions = { discriminatorKey: 'documentType', timestamps: { createdAt: 'uploadedAt', updatedAt: 'processedAt' } };

const DocumentSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, trim: true, index: true },
  status: { type: String, enum: ['pending', 'processed', 'failed', 'duplicate'], default: 'pending' },
  originalFileName: String,
  safeFileName: String,
  filePath: String,
  mimeType: String,
  extractedData: mongoose.Schema.Types.Mixed,
  processingErrors: [String]
}, commonOptions);

const Document = mongoose.model('Document', DocumentSchema);

const PurchaseOrderSchema = new mongoose.Schema({
  poDate: Date,
  vendorName: String,
  vendorCode: String,
  items: [{
    rawItemCode: String,
    itemName: String,
    skuMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'SkuMaster' },
    quantity: Number,
    unitPrice: Number,
    mrp: Number,
    uom: String,
    grossAmount: Number,
    skuResolutionStatus: { type: String, enum: ['resolved', 'unresolved'] },
    skuResolutionReason: String
  }],
  isDuplicate: { type: Boolean, default: false }
});

const GrnSchema = new mongoose.Schema({
  grnNumber: { type: String, index: true },
  grnDate: Date,
  items: [{
    rawItemCode: String,
    itemName: String,
    skuMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'SkuMaster' },
    receivedQuantity: Number,
    unitPrice: Number,
    mrp: Number,
    uom: String,
    skuResolutionStatus: { type: String, enum: ['resolved', 'unresolved'] },
    skuResolutionReason: String
  }],
  isDuplicate: { type: Boolean, default: false }
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, index: true },
  invoiceDate: Date,
  items: [{
    rawItemCode: String,
    itemName: String,
    skuMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'SkuMaster' },
    invoicedQuantity: Number,
    unitPrice: Number,
    mrp: Number,
    uom: String,
    grossAmount: Number,
    skuResolutionStatus: { type: String, enum: ['resolved', 'unresolved'] },
    skuResolutionReason: String
  }],
  isDuplicate: { type: Boolean, default: false }
});

const PurchaseOrder = Document.discriminator('purchase_order', PurchaseOrderSchema);
const Grn = Document.discriminator('grn', GrnSchema);
const Invoice = Document.discriminator('invoice', InvoiceSchema);

module.exports = {
  Document,
  PurchaseOrder,
  Grn,
  Invoice
};
