const mongoose = require('mongoose');

const MatchAuditSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, index: true },
  calculatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['matched', 'partially_matched', 'mismatch', 'insufficient_documents'] },
  reasons: [{
    code: String,
    severity: { type: String, enum: ['hard', 'warning'] },
    affectedSkuId: mongoose.Schema.Types.ObjectId,
    affectedItemCode: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  }],
  summary: {
    poAmount: { type: Number, default: 0 },
    totalInvoiced: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 }
  },
  skuResults: [mongoose.Schema.Types.Mixed]
});

module.exports = mongoose.model('MatchAudit', MatchAuditSchema);
