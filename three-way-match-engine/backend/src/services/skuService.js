const SkuMaster = require('../models/SkuMaster');

exports.resolveSkus = async (items) => {
  const resolvedItems = [];
  
  for (const item of items) {
    if (!item.rawItemCode) {
      resolvedItems.push({
        ...item,
        skuMaster: null,
        skuResolutionStatus: 'unresolved',
        skuResolutionReason: 'missing_raw_item_code'
      });
      continue;
    }

    const trimmedCode = item.rawItemCode.trim();
    let sku = await SkuMaster.findOne({ erpCode: new RegExp(`^${trimmedCode}$`, 'i') });
    
    if (!sku) {
      sku = await SkuMaster.findOne({ eanCode: new RegExp(`^${trimmedCode}$`, 'i') });
    }

    if (sku) {
      resolvedItems.push({
        ...item,
        skuMaster: sku._id,
        skuResolutionStatus: 'resolved'
      });
    } else {
      resolvedItems.push({
        ...item,
        skuMaster: null,
        skuResolutionStatus: 'unresolved',
        skuResolutionReason: 'unmapped_master_sku'
      });
    }
  }
  
  return resolvedItems;
};
