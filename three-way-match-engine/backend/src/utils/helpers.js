function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res, message, code = 'ERROR', status = 400) {
  return res.status(status).json({ success: false, message, code });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeItemCode(code) {
  return (code || '').trim().toLowerCase();
}

function getItemKey(item) {
  if (item.skuMasterId) {
    return `sku:${item.skuMasterId.toString()}`;
  }
  return `unmapped:${normalizeItemCode(item.rawItemCode)}`;
}

function aggregateItems(documents) {
  const map = new Map();

  for (const doc of documents) {
    for (const item of doc.items || []) {
      const key = getItemKey(item);
      const existing = map.get(key) || {
        skuMasterId: item.skuMasterId || null,
        rawItemCode: item.rawItemCode,
        skuName: item.skuName || item.rawItemCode,
        mappedSkuName: item.mappedSkuName || '',
        erpCode: item.erpCode || '',
        ean: item.ean || '',
        hsn: item.hsn || '',
        uom: item.uom || '',
        quantity: 0,
        unitRate: item.unitRate || 0,
        unitMrp: item.unitMrp || 0,
        grossAmount: 0,
        resolutionReason: item.resolutionReason || null,
      };

      existing.quantity += item.quantity || 0;
      existing.grossAmount += item.grossAmount || 0;
      if (item.unitRate) existing.unitRate = item.unitRate;
      if (item.unitMrp) existing.unitMrp = item.unitMrp;
      map.set(key, existing);
    }
  }

  return map;
}

function formatStatusLabel(status) {
  const labels = {
    matched: 'Matched',
    partially_matched: 'Partially Matched',
    mismatch: 'Mismatch',
    insufficient_documents: 'Insufficient Documents',
  };
  return labels[status] || status;
}

module.exports = {
  sendSuccess,
  sendError,
  escapeRegex,
  normalizeItemCode,
  getItemKey,
  aggregateItems,
  formatStatusLabel,
};
