const { PurchaseOrder, Grn, Invoice } = require('../models/Document');
const MatchAudit = require('../models/MatchAudit');
const SkuMaster = require('../models/SkuMaster');

exports.calculateMatch = async (poNumber) => {
  const pos = await PurchaseOrder.find({ poNumber, status: 'processed', isDuplicate: false }).populate('items.skuMaster');
  const grns = await Grn.find({ poNumber, status: 'processed', isDuplicate: false }).populate('items.skuMaster');
  const invoices = await Invoice.find({ poNumber, status: 'processed', isDuplicate: false }).populate('items.skuMaster');

  const reasons = [];
  
  if (pos.length === 0 || (grns.length === 0 && invoices.length === 0)) {
    return saveAudit(poNumber, 'insufficient_documents', reasons, { poAmount: 0, totalInvoiced: 0, totalReceived: 0 }, []);
  }

  if (pos.length > 1) reasons.push({ code: 'duplicate_po', severity: 'warning', message: 'Multiple POs found' });
  const po = pos[0];
  
  const poQtyMap = {};
  const skuMap = {};
  
  po.items.forEach(item => {
    const key = item.skuMaster ? item.skuMaster._id.toString() : item.rawItemCode;
    if (!poQtyMap[key]) poQtyMap[key] = { qty: 0, item };
    poQtyMap[key].qty += (item.quantity || 0);
    if (!skuMap[key]) skuMap[key] = item;
  });

  const grnQtyMap = {};
  grns.forEach(grn => {
    grn.items.forEach(item => {
      const key = item.skuMaster ? item.skuMaster._id.toString() : item.rawItemCode;
      if (!grnQtyMap[key]) grnQtyMap[key] = { qty: 0, mrp: item.mrp || 0 };
      grnQtyMap[key].qty += (item.receivedQuantity || 0);
      if (!skuMap[key]) skuMap[key] = item;
    });
  });

  const invoiceQtyMap = {};
  invoices.forEach(inv => {
    if (inv.invoiceDate && po.poDate && new Date(inv.invoiceDate) < new Date(po.poDate)) {
      reasons.push({ code: 'invoice_date_after_po_date', severity: 'warning', message: 'Invoice date before PO date' });
    }
    inv.items.forEach(item => {
      const key = item.skuMaster ? item.skuMaster._id.toString() : item.rawItemCode;
      if (!invoiceQtyMap[key]) invoiceQtyMap[key] = { qty: 0, price: item.unitPrice || 0, gross: 0 };
      invoiceQtyMap[key].qty += (item.invoicedQuantity || 0);
      invoiceQtyMap[key].gross += (item.grossAmount || 0);
      if (!skuMap[key]) skuMap[key] = item;
    });
  });

  let poAmount = 0;
  let totalInvoiced = 0;
  let totalReceived = 0;
  
  const skuResults = [];
  let isMismatch = false;
  let isPartial = reasons.length > 0;

  for (const key of Object.keys(skuMap)) {
    const item = skuMap[key];
    const poQty = poQtyMap[key] ? poQtyMap[key].qty : 0;
    const grnQty = grnQtyMap[key] ? grnQtyMap[key].qty : 0;
    const invoiceQty = invoiceQtyMap[key] ? invoiceQtyMap[key].qty : 0;
    
    totalInvoiced += (invoiceQtyMap[key] ? invoiceQtyMap[key].gross : 0);
    poAmount += poQty * (item.unitPrice || 0);
    totalReceived += grnQty * (item.unitPrice || 0);
    
    const issues = [];
    const isUnmapped = item.skuResolutionStatus === 'unresolved';
    
    if (isUnmapped) {
      issues.push('unmapped_master_sku');
      reasons.push({ code: 'unmapped_master_sku', severity: 'warning', affectedItemCode: item.rawItemCode, message: 'Unmapped SKU' });
      isPartial = true;
    }

    if (poQty === 0 && (grnQty > 0 || invoiceQty > 0)) {
      issues.push('item_missing_in_po');
      reasons.push({ code: 'item_missing_in_po', severity: 'warning', affectedItemCode: item.rawItemCode, message: 'Item in GRN/Invoice but not PO' });
      isPartial = true;
    }

    if (grnQty > poQty) {
      issues.push('grn_qty_exceeds_po_qty');
      reasons.push({ code: 'grn_qty_exceeds_po_qty', severity: 'hard', affectedItemCode: item.rawItemCode, message: 'GRN qty > PO qty' });
      isMismatch = true;
    }
    
    if (invoiceQty > poQty) {
      issues.push('invoice_qty_exceeds_po_qty');
      reasons.push({ code: 'invoice_qty_exceeds_po_qty', severity: 'hard', affectedItemCode: item.rawItemCode, message: 'Invoice qty > PO qty' });
      isMismatch = true;
    }
    
    if (invoiceQty > grnQty && grnQty > 0) {
      issues.push('invoice_qty_exceeds_grn_qty');
      reasons.push({ code: 'invoice_qty_exceeds_grn_qty', severity: 'hard', affectedItemCode: item.rawItemCode, message: 'Invoice qty > GRN qty' });
      isMismatch = true;
    }
    
    if (item.skuMaster && item.skuMaster.agreedRate > 0 && invoiceQtyMap[key]) {
      const tol = item.skuMaster.priceTolerance || 0.05;
      const price = invoiceQtyMap[key].price;
      const agreed = item.skuMaster.agreedRate;
      if (Math.abs(price - agreed) / agreed > tol) {
        issues.push('price_mismatch');
        reasons.push({ code: 'price_mismatch', severity: 'hard', affectedItemCode: item.rawItemCode, message: 'Price out of tolerance' });
        isMismatch = true;
      }
    }

    if (item.skuMaster && item.skuMaster.mrp > 0 && grnQtyMap[key]) {
      const mrp = grnQtyMap[key].mrp;
      const refMrp = item.skuMaster.mrp;
      if (Math.abs(mrp - refMrp) / refMrp > 0.01) {
        issues.push('mrp_mismatch');
        reasons.push({ code: 'mrp_mismatch', severity: 'warning', affectedItemCode: item.rawItemCode, message: 'MRP out of 1% tolerance' });
        isPartial = true;
      }
    }

    if (poQty !== grnQty || poQty !== invoiceQty) {
      isPartial = true;
    }

    skuResults.push({
      skuId: item.skuMaster ? item.skuMaster._id : null,
      erpCode: item.skuMaster ? item.skuMaster.erpCode : null,
      skuName: item.skuMaster ? item.skuMaster.skuName : null,
      rawItemCode: item.rawItemCode,
      poQty, grnQty, invoiceQty,
      unitPrice: invoiceQtyMap[key] ? invoiceQtyMap[key].price : 0,
      agreedRate: item.skuMaster ? item.skuMaster.agreedRate : 0,
      grossAmount: invoiceQtyMap[key] ? invoiceQtyMap[key].gross : 0,
      isUnmapped,
      issues
    });
  }

  let status = 'matched';
  if (isMismatch) status = 'mismatch';
  else if (isPartial || grns.length === 0 || invoices.length === 0) status = 'partially_matched';
  
  return saveAudit(poNumber, status, reasons, { poAmount, totalInvoiced, totalReceived }, skuResults);
};

async function saveAudit(poNumber, status, reasons, summary, skuResults) {
  let audit = await MatchAudit.findOne({ poNumber });
  if (audit) {
    audit.status = status;
    audit.reasons = reasons;
    audit.summary = summary;
    audit.skuResults = skuResults;
    audit.calculatedAt = new Date();
    await audit.save();
  } else {
    audit = await MatchAudit.create({ poNumber, status, reasons, summary, skuResults });
  }
  return audit;
}
