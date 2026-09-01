const { calculateMatch } = require('./matchService');
const PurchaseOrder = require('../models/PurchaseOrder');
const Grn = require('../models/Grn');
const Invoice = require('../models/Invoice');
const { formatStatusLabel } = require('../utils/helpers');

async function calculateSummary(poNumber) {
  const match = await calculateMatch(poNumber);
  const pos = await PurchaseOrder.find({ poNumber });
  const grns = await Grn.find({ poNumber });
  const invoices = await Invoice.find({ poNumber });

  const poAmount = pos.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  const totalReceived = grns.reduce((sum, g) => sum + (g.totalAmount || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  const associatedDocuments = [];

  for (const inv of invoices) {
    const qty = (inv.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
    associatedDocuments.push({
      documentType: 'Invoice',
      documentNumber: inv.invoiceNumber,
      date: inv.invoiceDate,
      cumulativeQuantity: qty,
      amount: inv.totalAmount || 0,
      pendingDelivery: 0,
      status: inv.isDuplicate ? 'Duplicate' : formatStatusLabel(match.status),
    });
  }

  for (const grn of grns) {
    const qty = (grn.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
    const poQty = pos.reduce((s, po) => s + (po.items || []).reduce((a, it) => a + (it.quantity || 0), 0), 0);
    associatedDocuments.push({
      documentType: 'GRN',
      documentNumber: grn.grnNumber,
      date: grn.grnDate,
      cumulativeQuantity: qty,
      amount: grn.totalAmount || 0,
      pendingDelivery: Math.max(0, poQty - qty),
      status: grn.isDuplicate ? 'Duplicate' : formatStatusLabel(match.status),
    });
  }

  return {
    poNumber,
    poAmount,
    totalInvoiced,
    totalReceived,
    currentStatus: match.status,
    currentStatusLabel: formatStatusLabel(match.status),
    associatedDocuments,
    match: {
      status: match.status,
      reasons: match.reasons,
      items: match.items,
    },
  };
}

module.exports = { calculateSummary };
