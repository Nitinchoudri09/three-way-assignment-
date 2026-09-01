const SkuMaster = require('../models/SkuMaster');
const { escapeRegex } = require('../utils/helpers');

async function resolveItem(itemCode) {
  const code = (itemCode || '').trim();
  if (!code) {
    return { skuMaster: null, reason: 'unmapped_master_sku' };
  }

  let sku = await SkuMaster.findOne({
    skuErpCode: { $regex: new RegExp(`^${escapeRegex(code)}$`, 'i') },
  });

  if (!sku) {
    sku = await SkuMaster.findOne({
      eanCode: { $regex: new RegExp(`^${escapeRegex(code)}$`, 'i') },
    });
  }

  if (!sku) {
    return { skuMaster: null, reason: 'unmapped_master_sku' };
  }

  return { skuMaster: sku, reason: null };
}

async function resolveDocumentItems(items) {
  const resolved = [];
  for (const item of items) {
    const { skuMaster, reason } = await resolveItem(item.itemCode || item.rawItemCode);
    resolved.push({
      rawItemCode: (item.itemCode || item.rawItemCode || '').trim(),
      skuMasterId: skuMaster ? skuMaster._id : null,
      skuName: item.skuName || item.itemName || (item.itemCode || item.rawItemCode || ''),
      mappedSkuName: skuMaster ? skuMaster.skuName : '',
      erpCode: skuMaster ? skuMaster.skuErpCode : (item.itemCode || item.rawItemCode || ''),
      ean: skuMaster ? skuMaster.eanCode : (item.ean || ''),
      hsn: skuMaster ? skuMaster.hsnCode : (item.hsn || ''),
      uom: skuMaster ? skuMaster.uom : (item.uom || ''),
      quantity: Number(item.quantity) || 0,
      unitRate: Number(item.unitRate ?? item.unitPrice) || 0,
      unitMrp: Number(item.unitMrp ?? item.mrp) || 0,
      grossAmount: Number(item.grossAmount) || (Number(item.quantity) || 0) * (Number(item.unitRate ?? item.unitPrice) || 0),
      resolutionReason: reason,
    });
  }
  return resolved;
}

module.exports = { resolveItem, resolveDocumentItems };
