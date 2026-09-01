require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config/env');
const SkuMaster = require('./models/SkuMaster');
const PurchaseOrder = require('./models/PurchaseOrder');
const Grn = require('./models/Grn');
const Invoice = require('./models/Invoice');
const { resolveDocumentItems } = require('./services/skuResolver');

const SKUS = [
  { skuErpCode: 'BIK-BIKANERI-200G', skuName: 'Bikaji Bikaneri Bhujia 200 G', eanCode: '8901234567890', hsnCode: '21069099', uom: 'PCS', agreedRate: 45, mrp: 60, priceTolerance: 0.05 },
  { skuErpCode: 'BIK-MIXTURE-400G', skuName: 'Bikaji Mixture 400 G', eanCode: '8901234567891', hsnCode: '21069099', uom: 'PCS', agreedRate: 80, mrp: 110, priceTolerance: 0.05 },
  { skuErpCode: 'HAL-BHUJIA-500G', skuName: 'Haldiram Bhujia 500 G', eanCode: '8901234567892', hsnCode: '21069099', uom: 'PCS', agreedRate: 120, mrp: 150, priceTolerance: 0.05 },
  { skuErpCode: 'PAR-GOLD-200G', skuName: 'Parle Gold Rusk 200 G', eanCode: '8901234567893', hsnCode: '19054000', uom: 'PCS', agreedRate: 35, mrp: 45, priceTolerance: 0.05 },
  { skuErpCode: 'BRI-GOODDAY-200G', skuName: 'Britannia Good Day 200 G', eanCode: '8901234567894', hsnCode: '19053100', uom: 'PCS', agreedRate: 30, mrp: 40, priceTolerance: 0.05 },
  { skuErpCode: 'LAYS-CLASSIC-52G', skuName: 'Lays Classic Salted 52 G', eanCode: '8901234567895', hsnCode: '20052000', uom: 'PCS', agreedRate: 20, mrp: 25, priceTolerance: 0.05 },
  { skuErpCode: 'KURKURE-MTG-90G', skuName: 'Kurkure Masala Munch 90 G', eanCode: '8901234567896', hsnCode: '21069099', uom: 'PCS', agreedRate: 18, mrp: 22, priceTolerance: 0.05 },
  { skuErpCode: 'ITC-BINGO-85G', skuName: 'Bingo Mad Angles 85 G', eanCode: '8901234567897', hsnCode: '21069099', uom: 'PCS', agreedRate: 22, mrp: 28, priceTolerance: 0.05 },
  { skuErpCode: 'NEST-MAGGI-70G', skuName: 'Maggi Noodles 70 G', eanCode: '8901234567898', hsnCode: '19023010', uom: 'PCS', agreedRate: 12, mrp: 14, priceTolerance: 0.05 },
  { skuErpCode: 'AMUL-GHEE-500ML', skuName: 'Amul Pure Ghee 500 ML', eanCode: '8901234567899', hsnCode: '04059020', uom: 'PCS', agreedRate: 320, mrp: 380, priceTolerance: 0.03 },
  { skuErpCode: 'TATA-TETLEY-100G', skuName: 'Tata Tetley Green Tea 100 G', eanCode: '8901234567900', hsnCode: '09021090', uom: 'PCS', agreedRate: 180, mrp: 220, priceTolerance: 0.05 },
];

async function seedDocuments() {
  async function saveDoc(type, data) {
    const items = await resolveDocumentItems(data.items);
    const totalAmount = items.reduce((s, i) => s + i.grossAmount, 0);
    const file = { originalFileName: 'seed.pdf', safeFileName: 'seed.pdf', filePath: '', mimeType: 'application/pdf' };

    if (type === 'po') {
      await PurchaseOrder.create({ poNumber: data.poNumber, poDate: new Date(data.poDate), vendorName: data.vendorName, items, file, totalAmount });
    } else if (type === 'grn') {
      await Grn.create({ poNumber: data.poNumber, grnNumber: data.grnNumber, grnDate: new Date(data.grnDate), vendorName: data.vendorName, items, file, totalAmount });
    } else {
      await Invoice.create({ poNumber: data.poNumber, invoiceNumber: data.invoiceNumber, invoiceDate: new Date(data.invoiceDate), vendorName: data.vendorName, items, file, totalAmount });
    }
  }

  // Scenario 1: Matched - PO10001
  await saveDoc('po', { poNumber: 'PO10001', poDate: '2026-01-15', vendorName: 'Bikaji Foods', items: [{ itemCode: 'BIK-BIKANERI-200G', quantity: 100, unitRate: 45, unitMrp: 60 }, { itemCode: 'BIK-MIXTURE-400G', quantity: 50, unitRate: 80, unitMrp: 110 }] });
  await saveDoc('grn', { poNumber: 'PO10001', grnNumber: 'GRN001', grnDate: '2026-01-20', vendorName: 'Bikaji Foods', items: [{ itemCode: 'BIK-BIKANERI-200G', quantity: 100, unitRate: 45, unitMrp: 60 }, { itemCode: 'BIK-MIXTURE-400G', quantity: 50, unitRate: 80, unitMrp: 110 }] });
  await saveDoc('inv', { poNumber: 'PO10001', invoiceNumber: 'INV001', invoiceDate: '2026-01-25', vendorName: 'Bikaji Foods', items: [{ itemCode: 'BIK-BIKANERI-200G', quantity: 100, unitRate: 45, unitMrp: 60 }, { itemCode: 'BIK-MIXTURE-400G', quantity: 50, unitRate: 80, unitMrp: 110 }] });

  // Scenario 2: Quantity mismatch - PO10002
  await saveDoc('po', { poNumber: 'PO10002', poDate: '2026-01-20', vendorName: 'Haldiram', items: [{ itemCode: 'HAL-BHUJIA-500G', quantity: 200, unitRate: 120, unitMrp: 150 }] });
  await saveDoc('grn', { poNumber: 'PO10002', grnNumber: 'GRN002', grnDate: '2026-01-22', vendorName: 'Haldiram', items: [{ itemCode: 'HAL-BHUJIA-500G', quantity: 250, unitRate: 120, unitMrp: 150 }] });
  await saveDoc('inv', { poNumber: 'PO10002', invoiceNumber: 'INV002', invoiceDate: '2026-01-28', vendorName: 'Haldiram', items: [{ itemCode: 'HAL-BHUJIA-500G', quantity: 250, unitRate: 120, unitMrp: 150 }] });

  // Scenario 3: Price mismatch - PO10003
  await saveDoc('po', { poNumber: 'PO10003', poDate: '2026-02-01', vendorName: 'Parle', items: [{ itemCode: 'PAR-GOLD-200G', quantity: 150, unitRate: 35, unitMrp: 45 }] });
  await saveDoc('grn', { poNumber: 'PO10003', grnNumber: 'GRN003', grnDate: '2026-02-05', vendorName: 'Parle', items: [{ itemCode: 'PAR-GOLD-200G', quantity: 150, unitRate: 35, unitMrp: 45 }] });
  await saveDoc('inv', { poNumber: 'PO10003', invoiceNumber: 'INV003', invoiceDate: '2026-02-08', vendorName: 'Parle', items: [{ itemCode: 'PAR-GOLD-200G', quantity: 150, unitRate: 50, unitMrp: 45 }] });

  // Scenario 4: Unmapped SKU - PO10004
  await saveDoc('po', { poNumber: 'PO10004', poDate: '2026-02-10', vendorName: 'Unknown', items: [{ itemCode: 'UNKNOWN-SKU-001', quantity: 25, unitRate: 100, unitMrp: 120 }] });
  await saveDoc('grn', { poNumber: 'PO10004', grnNumber: 'GRN004', grnDate: '2026-02-12', vendorName: 'Unknown', items: [{ itemCode: 'UNKNOWN-SKU-001', quantity: 25, unitRate: 100, unitMrp: 120 }] });
  await saveDoc('inv', { poNumber: 'PO10004', invoiceNumber: 'INV004', invoiceDate: '2026-02-14', vendorName: 'Unknown', items: [{ itemCode: 'UNKNOWN-SKU-001', quantity: 25, unitRate: 100, unitMrp: 120 }] });

  // Scenario 5: Insufficient documents - PO10005 (PO only)
  await saveDoc('po', { poNumber: 'PO10005', poDate: '2026-02-15', vendorName: 'Britannia', items: [{ itemCode: 'BRI-GOODDAY-200G', quantity: 80, unitRate: 30, unitMrp: 40 }] });

  // Scenario 6: Duplicate PO - PO10006
  await saveDoc('po', { poNumber: 'PO10006', poDate: '2026-02-16', vendorName: 'Lays', items: [{ itemCode: 'LAYS-CLASSIC-52G', quantity: 100, unitRate: 20, unitMrp: 25 }] });
  const dupItems = await resolveDocumentItems([{ itemCode: 'LAYS-CLASSIC-52G', quantity: 100, unitRate: 20, unitMrp: 25 }]);
  await PurchaseOrder.create({ poNumber: 'PO10006', poDate: new Date('2026-02-16'), vendorName: 'Lays', items: dupItems, file: { originalFileName: 'dup.pdf', safeFileName: 'dup.pdf', filePath: '', mimeType: 'application/pdf' }, totalAmount: 2000, isDuplicate: true, duplicateReason: 'duplicate_po' });
  await saveDoc('grn', { poNumber: 'PO10006', grnNumber: 'GRN006', grnDate: '2026-02-18', vendorName: 'Lays', items: [{ itemCode: 'LAYS-CLASSIC-52G', quantity: 100, unitRate: 20, unitMrp: 25 }] });
  await saveDoc('inv', { poNumber: 'PO10006', invoiceNumber: 'INV006', invoiceDate: '2026-02-20', vendorName: 'Lays', items: [{ itemCode: 'LAYS-CLASSIC-52G', quantity: 100, unitRate: 20, unitMrp: 25 }] });

  // Scenario 7: Multiple GRNs - PO10007
  await saveDoc('po', { poNumber: 'PO10007', poDate: '2026-02-18', vendorName: 'Kurkure', items: [{ itemCode: 'KURKURE-MTG-90G', quantity: 200, unitRate: 18, unitMrp: 22 }] });
  await saveDoc('grn', { poNumber: 'PO10007', grnNumber: 'GRN007A', grnDate: '2026-02-20', vendorName: 'Kurkure', items: [{ itemCode: 'KURKURE-MTG-90G', quantity: 120, unitRate: 18, unitMrp: 22 }] });
  await saveDoc('grn', { poNumber: 'PO10007', grnNumber: 'GRN007B', grnDate: '2026-02-22', vendorName: 'Kurkure', items: [{ itemCode: 'KURKURE-MTG-90G', quantity: 80, unitRate: 18, unitMrp: 22 }] });
  await saveDoc('inv', { poNumber: 'PO10007', invoiceNumber: 'INV007', invoiceDate: '2026-02-25', vendorName: 'Kurkure', items: [{ itemCode: 'KURKURE-MTG-90G', quantity: 200, unitRate: 18, unitMrp: 22 }] });

  // Scenario 8: Multiple Invoices - PO10008
  await saveDoc('po', { poNumber: 'PO10008', poDate: '2026-02-20', vendorName: 'Bingo', items: [{ itemCode: 'ITC-BINGO-85G', quantity: 300, unitRate: 22, unitMrp: 28 }] });
  await saveDoc('grn', { poNumber: 'PO10008', grnNumber: 'GRN008', grnDate: '2026-02-22', vendorName: 'Bingo', items: [{ itemCode: 'ITC-BINGO-85G', quantity: 300, unitRate: 22, unitMrp: 28 }] });
  await saveDoc('inv', { poNumber: 'PO10008', invoiceNumber: 'INV008A', invoiceDate: '2026-02-24', vendorName: 'Bingo', items: [{ itemCode: 'ITC-BINGO-85G', quantity: 150, unitRate: 22, unitMrp: 28 }] });
  await saveDoc('inv', { poNumber: 'PO10008', invoiceNumber: 'INV008B', invoiceDate: '2026-02-26', vendorName: 'Bingo', items: [{ itemCode: 'ITC-BINGO-85G', quantity: 150, unitRate: 22, unitMrp: 28 }] });

  // Scenario 9: MRP mismatch - PO10009
  await saveDoc('po', { poNumber: 'PO10009', poDate: '2026-02-22', vendorName: 'Nestle', items: [{ itemCode: 'NEST-MAGGI-70G', quantity: 500, unitRate: 12, unitMrp: 14 }] });
  await saveDoc('grn', { poNumber: 'PO10009', grnNumber: 'GRN009', grnDate: '2026-02-24', vendorName: 'Nestle', items: [{ itemCode: 'NEST-MAGGI-70G', quantity: 500, unitRate: 12, unitMrp: 20 }] });
  await saveDoc('inv', { poNumber: 'PO10009', invoiceNumber: 'INV009', invoiceDate: '2026-02-26', vendorName: 'Nestle', items: [{ itemCode: 'NEST-MAGGI-70G', quantity: 500, unitRate: 12, unitMrp: 20 }] });

  // Scenario 10: Partially matched (qty not fully reconciled) - PO10010
  await saveDoc('po', { poNumber: 'PO10010', poDate: '2026-02-24', vendorName: 'Amul', items: [{ itemCode: 'AMUL-GHEE-500ML', quantity: 50, unitRate: 320, unitMrp: 380 }] });
  await saveDoc('grn', { poNumber: 'PO10010', grnNumber: 'GRN010', grnDate: '2026-02-26', vendorName: 'Amul', items: [{ itemCode: 'AMUL-GHEE-500ML', quantity: 50, unitRate: 320, unitMrp: 380 }] });
  await saveDoc('inv', { poNumber: 'PO10010', invoiceNumber: 'INV010', invoiceDate: '2026-02-28', vendorName: 'Amul', items: [{ itemCode: 'AMUL-GHEE-500ML', quantity: 45, unitRate: 320, unitMrp: 380 }] });
}

async function seed() {
  await mongoose.connect(config.mongodbUri);
  console.log('Connected to MongoDB');

  await SkuMaster.deleteMany({});
  await PurchaseOrder.deleteMany({});
  await Grn.deleteMany({});
  await Invoice.deleteMany({});

  await SkuMaster.insertMany(SKUS);
  console.log(`Seeded ${SKUS.length} SKU records`);

  await seedDocuments();
  console.log('Seeded demo PO/GRN/Invoice documents');

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
