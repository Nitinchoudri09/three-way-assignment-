const MOCK_SCENARIOS = {
  matched: {
    poNumber: 'PO10001',
    poDate: '2026-01-15',
    vendorName: 'Bikaji Foods Pvt Ltd',
    items: [
      { itemCode: 'BIK-BIKANERI-200G', skuName: 'Bikaji Bikaneri Bhujia 200G', quantity: 100, unitRate: 45, unitMrp: 60, grossAmount: 4500 },
      { itemCode: 'BIK-MIXTURE-400G', skuName: 'Bikaji Mixture 400G', quantity: 50, unitRate: 80, unitMrp: 110, grossAmount: 4000 },
    ],
    totalAmount: 8500,
  },
  qty_mismatch: {
    poNumber: 'PO10002',
    poDate: '2026-01-20',
    vendorName: 'Haldiram Snacks',
    items: [
      { itemCode: 'HAL-BHUJIA-500G', skuName: 'Haldiram Bhujia 500G', quantity: 200, unitRate: 120, unitMrp: 150, grossAmount: 24000 },
    ],
    totalAmount: 24000,
  },
  price_mismatch: {
    poNumber: 'PO10003',
    poDate: '2026-02-01',
    vendorName: 'Parle Products',
    items: [
      { itemCode: 'PAR-GOLD-200G', skuName: 'Parle Gold Rusk 200G', quantity: 150, unitRate: 35, unitMrp: 45, grossAmount: 5250 },
    ],
    totalAmount: 5250,
  },
  unmapped: {
    poNumber: 'PO10004',
    poDate: '2026-02-10',
    vendorName: 'Unknown Vendor',
    items: [
      { itemCode: 'UNKNOWN-SKU-001', skuName: 'Unknown Product', quantity: 25, unitRate: 100, unitMrp: 120, grossAmount: 2500 },
    ],
    totalAmount: 2500,
  },
  insufficient: {
    poNumber: 'PO10005',
    poDate: '2026-02-15',
    vendorName: 'Britannia Industries',
    items: [
      { itemCode: 'BRI-GOODDAY-200G', skuName: 'Britannia Good Day 200G', quantity: 80, unitRate: 30, unitMrp: 40, grossAmount: 2400 },
    ],
    totalAmount: 2400,
  },
};

function detectScenario(filename) {
  const lower = (filename || '').toLowerCase();
  if (lower.includes('qty') || lower.includes('quantity')) return 'qty_mismatch';
  if (lower.includes('price')) return 'price_mismatch';
  if (lower.includes('unmapped')) return 'unmapped';
  if (lower.includes('insufficient')) return 'insufficient';
  if (lower.includes('po10002')) return 'qty_mismatch';
  if (lower.includes('po10003')) return 'price_mismatch';
  if (lower.includes('po10004')) return 'unmapped';
  if (lower.includes('po10005')) return 'insufficient';
  return 'matched';
}

function getMockPO(filename) {
  const scenario = detectScenario(filename);
  return { ...MOCK_SCENARIOS[scenario] };
}

function getMockGRN(filename) {
  const scenario = detectScenario(filename);
  const base = MOCK_SCENARIOS[scenario];
  const grn = {
    poNumber: base.poNumber,
    grnNumber: `GRN-${base.poNumber.slice(2)}`,
    grnDate: '2026-01-25',
    vendorName: base.vendorName,
    items: base.items.map((i) => ({ ...i })),
    totalAmount: base.totalAmount,
  };

  if (scenario === 'qty_mismatch') {
    grn.items[0].quantity = 250;
    grn.totalAmount = grn.items[0].quantity * grn.items[0].unitRate;
  }
  if (scenario === 'matched') {
    grn.grnNumber = 'GRN001';
  }
  return grn;
}

function getMockInvoice(filename) {
  const scenario = detectScenario(filename);
  const base = MOCK_SCENARIOS[scenario];
  const inv = {
    poNumber: base.poNumber,
    invoiceNumber: `INV-${base.poNumber.slice(2)}`,
    invoiceDate: '2026-02-05',
    vendorName: base.vendorName,
    items: base.items.map((i) => ({ ...i })),
    totalAmount: base.totalAmount,
  };

  if (scenario === 'qty_mismatch') {
    inv.items[0].quantity = 250;
    inv.totalAmount = inv.items[0].quantity * inv.items[0].unitRate;
  }
  if (scenario === 'price_mismatch') {
    inv.items[0].unitRate = 50;
    inv.totalAmount = inv.items[0].quantity * inv.items[0].unitRate;
  }
  if (scenario === 'matched') {
    inv.invoiceNumber = 'INV001';
  }
  return inv;
}

function getMockData(documentType, filename) {
  switch (documentType) {
    case 'purchase_order':
      return getMockPO(filename);
    case 'grn':
      return getMockGRN(filename);
    case 'invoice':
      return getMockInvoice(filename);
    default:
      return getMockPO(filename);
  }
}

module.exports = { getMockData, MOCK_SCENARIOS };
