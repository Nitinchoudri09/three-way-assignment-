/**
 * matchService.test.js
 * Comprehensive unit tests for the Three-Way Match Engine
 */

const matchService = require('../src/services/matchService');
const skuService = require('../src/services/skuService');

// --- Mock setup ---
jest.mock('../src/models/Document', () => ({
  PurchaseOrder: { find: jest.fn() },
  Grn: { find: jest.fn() },
  Invoice: { find: jest.fn() },
}));

jest.mock('../src/models/MatchAudit', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../src/models/SkuMaster');

const { PurchaseOrder, Grn, Invoice } = require('../src/models/Document');
const MatchAudit = require('../src/models/MatchAudit');
const SkuMaster = require('../src/models/SkuMaster');

// Helper: make find return a chainable mock with populate()
function mockFind(results) {
  return { populate: jest.fn().mockResolvedValue(results) };
}

// Common SKU master
const sku1 = { _id: 'sku-1', erpCode: 'SKU-A', eanCode: '1234', skuName: 'SKU A', agreedRate: 100, mrp: 120, priceTolerance: 0.05 };
const sku2 = { _id: 'sku-2', erpCode: 'SKU-B', eanCode: '5678', skuName: 'SKU B', agreedRate: 50, mrp: 60, priceTolerance: 0.05 };

function makeAuditMocks(existing = null) {
  MatchAudit.findOne.mockResolvedValue(existing);
  if (!existing) {
    MatchAudit.create.mockImplementation((data) => Promise.resolve(data));
  } else {
    existing.save = jest.fn().mockResolvedValue(existing);
  }
}

beforeEach(() => {
  jest.resetAllMocks(); // Reset implementations AND call history
});

// ===================== SKU RESOLUTION TESTS =====================

describe('SKU Resolution', () => {
  test('resolves item by ERP code (case-insensitive)', async () => {
    SkuMaster.findOne.mockResolvedValueOnce(sku1).mockResolvedValueOnce(null);
    const items = [{ rawItemCode: 'sku-a' }];
    const resolved = await skuService.resolveSkus(items);
    expect(resolved[0].skuResolutionStatus).toBe('resolved');
    expect(resolved[0].skuMaster).toBe('sku-1');
  });

  test('resolves item by EAN code when ERP lookup fails', async () => {
    // First call (ERP lookup) returns null, second call (EAN lookup) returns sku1
    SkuMaster.findOne
      .mockReturnValueOnce(Promise.resolve(null))   // ERP lookup fails
      .mockReturnValueOnce(Promise.resolve(sku1));  // EAN lookup succeeds
    const items = [{ rawItemCode: '1234' }];
    const resolved = await skuService.resolveSkus(items);
    expect(resolved[0].skuResolutionStatus).toBe('resolved');
  });

  test('unmapped SKU: remains visible with unresolved status', async () => {
    // Both ERP and EAN lookups fail
    SkuMaster.findOne.mockImplementation(() => Promise.resolve(null));
    const items = [{ rawItemCode: 'UNKNOWN-ITEM' }];
    const resolved = await skuService.resolveSkus(items);
    expect(resolved[0].skuResolutionStatus).toBe('unresolved');
    expect(resolved[0].skuMaster).toBeNull();
    expect(resolved[0].skuResolutionReason).toBe('unmapped_master_sku');
    expect(resolved.length).toBe(1); // Never deleted
  });
});

// ===================== MATCH STATUS TESTS =====================

describe('Match Status', () => {
  test('insufficient_documents: no PO at all', async () => {
    PurchaseOrder.find.mockReturnValue(mockFind([]));
    Grn.find.mockReturnValue(mockFind([]));
    Invoice.find.mockReturnValue(mockFind([]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO-NONE');
    expect(result.status).toBe('insufficient_documents');
  });

  test('insufficient_documents: PO exists but no GRN and no Invoice', async () => {
    const po = { poNumber: 'PO1', poDate: new Date('2024-01-01'), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([]));
    Invoice.find.mockReturnValue(mockFind([]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    expect(result.status).toBe('insufficient_documents');
  });

  test('matched: all quantities equal, no mismatches', async () => {
    const po = { poNumber: 'PO1', poDate: new Date('2024-01-01'), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', grnDate: new Date('2024-01-10'), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 100, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date('2024-01-12'), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, invoicedQuantity: 100, unitPrice: 100, mrp: 120, grossAmount: 10000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    expect(result.status).toBe('matched');
    expect(result.reasons.length).toBe(0);
  });
});

// ===================== QUANTITY MISMATCH TESTS =====================

describe('Quantity Rules', () => {
  test('grn_qty_exceeds_po_qty: hard mismatch when GRN > PO', async () => {
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 50, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 70, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, invoicedQuantity: 50, unitPrice: 100, grossAmount: 5000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasMismatch = result.reasons.some(r => r.code === 'grn_qty_exceeds_po_qty');
    expect(hasMismatch).toBe(true);
    expect(result.status).toBe('mismatch');
  });

  test('invoice_qty_exceeds_po_qty: hard mismatch when Invoice > PO', async () => {
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 50, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 50, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, invoicedQuantity: 80, unitPrice: 100, grossAmount: 8000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasMismatch = result.reasons.some(r => r.code === 'invoice_qty_exceeds_po_qty');
    expect(hasMismatch).toBe(true);
  });

  test('invoice_qty_exceeds_grn_qty: hard mismatch', async () => {
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 60, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, invoicedQuantity: 80, unitPrice: 100, grossAmount: 8000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasMismatch = result.reasons.some(r => r.code === 'invoice_qty_exceeds_grn_qty');
    expect(hasMismatch).toBe(true);
  });

  test('quantity aggregation: same SKU multiple times aggregated correctly', async () => {
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [
        { rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 30, unitPrice: 100, skuResolutionStatus: 'resolved' },
        { rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 70, unitPrice: 100, skuResolutionStatus: 'resolved' }
      ] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 100, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, invoicedQuantity: 100, unitPrice: 100, grossAmount: 10000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    expect(result.status).toBe('matched'); // 30+70=100 = 100 = 100
  });

  test('multiple GRNs: aggregated correctly', async () => {
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn1 = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 60, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const grn2 = { grnNumber: 'GRN2', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 40, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, invoicedQuantity: 100, unitPrice: 100, grossAmount: 10000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn1, grn2]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    expect(result.status).toBe('matched'); // 60+40=100
  });
});

// ===================== PRICE/MRP TESTS =====================

describe('Price and MRP Rules', () => {
  test('price within tolerance: no mismatch', async () => {
    const skuTol = { ...sku1, agreedRate: 100, priceTolerance: 0.05 };
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuTol, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuTol, receivedQuantity: 100, unitPrice: 104, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuTol, invoicedQuantity: 100, unitPrice: 104, grossAmount: 10400, skuResolutionStatus: 'resolved' }] }; // 4% within 5%
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasPriceMismatch = result.reasons.some(r => r.code === 'price_mismatch');
    expect(hasPriceMismatch).toBe(false);
  });

  test('price_mismatch: invoice price exceeds tolerance', async () => {
    const skuTol = { ...sku1, agreedRate: 100, priceTolerance: 0.05 };
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuTol, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuTol, receivedQuantity: 100, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuTol, invoicedQuantity: 100, unitPrice: 115, grossAmount: 11500, skuResolutionStatus: 'resolved' }] }; // 15% > 5%
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasPriceMismatch = result.reasons.some(r => r.code === 'price_mismatch');
    expect(hasPriceMismatch).toBe(true);
    expect(result.status).toBe('mismatch');
  });

  test('no price_mismatch when agreedRate is zero', async () => {
    const skuZero = { ...sku1, agreedRate: 0, priceTolerance: 0.05 };
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuZero, quantity: 100, unitPrice: 0, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuZero, receivedQuantity: 100, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuZero, invoicedQuantity: 100, unitPrice: 999, grossAmount: 99900, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasPriceMismatch = result.reasons.some(r => r.code === 'price_mismatch');
    expect(hasPriceMismatch).toBe(false); // Zero agreedRate -> no price check
  });

  test('mrp_mismatch: MRP deviation > 1%', async () => {
    const skuMrp = { ...sku1, mrp: 100, agreedRate: 0 };
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuMrp, quantity: 100, unitPrice: 80, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuMrp, receivedQuantity: 100, unitPrice: 80, mrp: 115, skuResolutionStatus: 'resolved' }] }; // 15% deviation
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: skuMrp, invoicedQuantity: 100, unitPrice: 80, grossAmount: 8000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasMrpMismatch = result.reasons.some(r => r.code === 'mrp_mismatch');
    expect(hasMrpMismatch).toBe(true);
  });
});

// ===================== DUPLICATE / MISSING TESTS =====================

describe('Duplicate and Missing Item Rules', () => {
  test('duplicate_po: warning when multiple POs found', async () => {
    const po1 = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const po2 = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 100, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, invoicedQuantity: 100, unitPrice: 100, grossAmount: 10000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po1, po2]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasDuplicate = result.reasons.some(r => r.code === 'duplicate_po');
    expect(hasDuplicate).toBe(true);
  });

  test('item_missing_in_po: warning when GRN item not in PO', async () => {
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [
        { rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 100, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' },
        { rawItemCode: 'SKU-B', skuMaster: sku2, receivedQuantity: 10, unitPrice: 50, mrp: 60, skuResolutionStatus: 'resolved' }
      ] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, invoicedQuantity: 100, unitPrice: 100, grossAmount: 10000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasMissing = result.reasons.some(r => r.code === 'item_missing_in_po');
    expect(hasMissing).toBe(true);
  });

  test('unmapped_master_sku: unresolved items flagged as warning', async () => {
    const po = { poNumber: 'PO1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'MYSTERY-ITEM', skuMaster: null, quantity: 50, unitPrice: 0, skuResolutionStatus: 'unresolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'MYSTERY-ITEM', skuMaster: null, receivedQuantity: 50, unitPrice: 0, mrp: 0, skuResolutionStatus: 'unresolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date(), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'MYSTERY-ITEM', skuMaster: null, invoicedQuantity: 50, unitPrice: 0, grossAmount: 0, skuResolutionStatus: 'unresolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasUnmapped = result.reasons.some(r => r.code === 'unmapped_master_sku');
    expect(hasUnmapped).toBe(true);
  });

  test('invoice_date_after_po_date: warning when invoice before PO', async () => {
    const po = { poNumber: 'PO1', poDate: new Date('2024-06-01'), isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, quantity: 100, unitPrice: 100, skuResolutionStatus: 'resolved' }] };
    const grn = { grnNumber: 'GRN1', isDuplicate: false, status: 'processed',
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, receivedQuantity: 100, unitPrice: 100, mrp: 120, skuResolutionStatus: 'resolved' }] };
    const inv = { invoiceNumber: 'INV1', invoiceDate: new Date('2024-01-01'), isDuplicate: false, status: 'processed', // BEFORE PO date
      items: [{ rawItemCode: 'SKU-A', skuMaster: sku1, invoicedQuantity: 100, unitPrice: 100, grossAmount: 10000, skuResolutionStatus: 'resolved' }] };
    PurchaseOrder.find.mockReturnValue(mockFind([po]));
    Grn.find.mockReturnValue(mockFind([grn]));
    Invoice.find.mockReturnValue(mockFind([inv]));
    makeAuditMocks();

    const result = await matchService.calculateMatch('PO1');
    const hasDateIssue = result.reasons.some(r => r.code === 'invoice_date_after_po_date');
    expect(hasDateIssue).toBe(true);
  });
});
