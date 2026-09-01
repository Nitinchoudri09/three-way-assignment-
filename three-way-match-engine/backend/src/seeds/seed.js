const mongoose = require('mongoose');
const SkuMaster = require('../models/SkuMaster');
const { Document, PurchaseOrder, Grn, Invoice } = require('../models/Document');
const MatchAudit = require('../models/MatchAudit');
const matchService = require('../services/matchService');
const connectDB = require('../config/database');
const logger = require('../utils/logger');
require('dotenv').config();

const skus = [
  { erpCode: 'BIK-BIKANERI-200G', skuName: 'Bikaji Bikaneri Bhujia 200G', eanCode: '8904005100093', hsnCode: '21069099', uom: 'PCS', agreedRate: 45.00, mrp: 50.00, priceTolerance: 0.05 },
  { erpCode: 'BIK-ALOO-200G', skuName: 'Bikaji Aloo Bhujia 200G', eanCode: '8904005100109', hsnCode: '21069099', uom: 'PCS', agreedRate: 40.00, mrp: 45.00, priceTolerance: 0.05 },
  { erpCode: 'HAL-SOAN-400G', skuName: 'Haldirams Soan Papdi 400G', eanCode: '8901072020026', hsnCode: '17049099', uom: 'PCS', agreedRate: 110.00, mrp: 120.00, priceTolerance: 0.05 },
  { erpCode: 'HAL-BHUJIA-200G', skuName: 'Haldirams Bhujia 200G', eanCode: '8901072020033', hsnCode: '21069099', uom: 'PCS', agreedRate: 42.00, mrp: 48.00, priceTolerance: 0.05 },
  { erpCode: 'MDH-CHANA-100G', skuName: 'MDH Chana Masala 100G', eanCode: '8901259000123', hsnCode: '09109900', uom: 'PCS', agreedRate: 55.00, mrp: 60.00, priceTolerance: 0.03 },
  { erpCode: 'AMU-BUTTER-500G', skuName: 'Amul Butter 500G', eanCode: '8901058000017', hsnCode: '04051000', uom: 'PCS', agreedRate: 230.00, mrp: 250.00, priceTolerance: 0.02 },
  { erpCode: 'TTA-TEA-250G', skuName: 'Tata Tea Premium 250G', eanCode: '8901431002018', hsnCode: '09021020', uom: 'PCS', agreedRate: 85.00, mrp: 95.00, priceTolerance: 0.05 },
  { erpCode: 'BRI-MARIE-250G', skuName: 'Britannia Marie Gold 250G', eanCode: '8901063000027', hsnCode: '19053100', uom: 'PCS', agreedRate: 30.00, mrp: 35.00, priceTolerance: 0.05 },
  { erpCode: 'NES-MAGGI-70G', skuName: 'Nestle Maggi Noodles 70G', eanCode: '8901058855497', hsnCode: '19023000', uom: 'PCS', agreedRate: 12.00, mrp: 14.00, priceTolerance: 0.05 },
  { erpCode: 'PAR-GPARLE-100G', skuName: 'Parle G Biscuits 100G', eanCode: '8901719100019', hsnCode: '19053100', uom: 'PCS', agreedRate: 8.00, mrp: 10.00, priceTolerance: 0.05 },
  { erpCode: 'LUX-SOAP-100G', skuName: 'Lux Soap 100G', eanCode: '8901030400031', hsnCode: '34011100', uom: 'PCS', agreedRate: 35.00, mrp: 40.00, priceTolerance: 0.05 },
  { erpCode: 'SUR-OIL-1L', skuName: 'Saffola Gold Oil 1L', eanCode: '8901519120153', hsnCode: '15121100', uom: 'PCS', agreedRate: 145.00, mrp: 160.00, priceTolerance: 0.03 }
];

async function seedData() {
  await connectDB();
  logger.info('Clearing existing data...');
  await SkuMaster.deleteMany();
  await Document.deleteMany();
  await MatchAudit.deleteMany();

  logger.info('Seeding SKU Masters...');
  const insertedSkus = await SkuMaster.insertMany(skus);
  
  const getSkuRef = (erpCode) => insertedSkus.find(s => s.erpCode === erpCode)._id;

  logger.info('Seeding Documents...');
  
  // Scenario 1: Fully matched (PO10001)
  const po1 = await PurchaseOrder.create({
    poNumber: 'PO10001', status: 'processed', poDate: new Date('2024-01-15'), vendorName: 'Bikaji Foods', vendorCode: 'VND-001',
    items: [
      { rawItemCode: 'BIK-BIKANERI-200G', itemName: 'Bikaji Bikaneri Bhujia 200G', skuMaster: getSkuRef('BIK-BIKANERI-200G'), quantity: 100, unitPrice: 45, mrp: 50, uom: 'PCS', skuResolutionStatus: 'resolved' },
      { rawItemCode: 'BIK-ALOO-200G', itemName: 'Bikaji Aloo Bhujia 200G', skuMaster: getSkuRef('BIK-ALOO-200G'), quantity: 50, unitPrice: 40, mrp: 45, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  await Grn.create({
    poNumber: 'PO10001', grnNumber: 'GRN10001', status: 'processed', grnDate: new Date('2024-01-20'),
    items: [
      { rawItemCode: 'BIK-BIKANERI-200G', skuMaster: getSkuRef('BIK-BIKANERI-200G'), receivedQuantity: 100, unitPrice: 45, mrp: 50, uom: 'PCS', skuResolutionStatus: 'resolved' },
      { rawItemCode: 'BIK-ALOO-200G', skuMaster: getSkuRef('BIK-ALOO-200G'), receivedQuantity: 50, unitPrice: 40, mrp: 45, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  await Invoice.create({
    poNumber: 'PO10001', invoiceNumber: 'INV10001', status: 'processed', invoiceDate: new Date('2024-01-22'),
    items: [
      { rawItemCode: 'BIK-BIKANERI-200G', skuMaster: getSkuRef('BIK-BIKANERI-200G'), invoicedQuantity: 100, unitPrice: 45, grossAmount: 4500, uom: 'PCS', skuResolutionStatus: 'resolved' },
      { rawItemCode: 'BIK-ALOO-200G', skuMaster: getSkuRef('BIK-ALOO-200G'), invoicedQuantity: 50, unitPrice: 40, grossAmount: 2000, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  // Scenario 2: Partially matched (PO10002) - short receipt
  await PurchaseOrder.create({
    poNumber: 'PO10002', status: 'processed', poDate: new Date('2024-01-15'), vendorName: 'Haldirams', vendorCode: 'VND-002',
    items: [
      { rawItemCode: 'HAL-SOAN-400G', skuMaster: getSkuRef('HAL-SOAN-400G'), quantity: 100, unitPrice: 110, mrp: 120, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  await Grn.create({
    poNumber: 'PO10002', grnNumber: 'GRN10002', status: 'processed', grnDate: new Date('2024-01-20'),
    items: [
      { rawItemCode: 'HAL-SOAN-400G', skuMaster: getSkuRef('HAL-SOAN-400G'), receivedQuantity: 90, unitPrice: 110, mrp: 120, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  await Invoice.create({
    poNumber: 'PO10002', invoiceNumber: 'INV10002', status: 'processed', invoiceDate: new Date('2024-01-22'),
    items: [
      { rawItemCode: 'HAL-SOAN-400G', skuMaster: getSkuRef('HAL-SOAN-400G'), invoicedQuantity: 90, unitPrice: 110, grossAmount: 9900, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  // Scenario 3: Qty mismatch (PO10003) - over receipt
  await PurchaseOrder.create({
    poNumber: 'PO10003', status: 'processed', poDate: new Date('2024-01-15'), vendorName: 'Tata', vendorCode: 'VND-003',
    items: [
      { rawItemCode: 'TTA-TEA-250G', skuMaster: getSkuRef('TTA-TEA-250G'), quantity: 50, unitPrice: 85, mrp: 95, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  await Grn.create({
    poNumber: 'PO10003', grnNumber: 'GRN10003', status: 'processed', grnDate: new Date('2024-01-20'),
    items: [
      { rawItemCode: 'TTA-TEA-250G', skuMaster: getSkuRef('TTA-TEA-250G'), receivedQuantity: 60, unitPrice: 85, mrp: 95, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  await Invoice.create({
    poNumber: 'PO10003', invoiceNumber: 'INV10003', status: 'processed', invoiceDate: new Date('2024-01-22'),
    items: [
      { rawItemCode: 'TTA-TEA-250G', skuMaster: getSkuRef('TTA-TEA-250G'), invoicedQuantity: 60, unitPrice: 85, grossAmount: 5100, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });
  
  // Scenario 4: Price mismatch (PO10004)
  await PurchaseOrder.create({
    poNumber: 'PO10004', status: 'processed', poDate: new Date('2024-01-15'), vendorName: 'Amul', vendorCode: 'VND-004',
    items: [
      { rawItemCode: 'AMU-BUTTER-500G', skuMaster: getSkuRef('AMU-BUTTER-500G'), quantity: 100, unitPrice: 230, mrp: 250, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  await Grn.create({
    poNumber: 'PO10004', grnNumber: 'GRN10004', status: 'processed', grnDate: new Date('2024-01-20'),
    items: [
      { rawItemCode: 'AMU-BUTTER-500G', skuMaster: getSkuRef('AMU-BUTTER-500G'), receivedQuantity: 100, unitPrice: 230, mrp: 250, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  await Invoice.create({
    poNumber: 'PO10004', invoiceNumber: 'INV10004', status: 'processed', invoiceDate: new Date('2024-01-22'),
    items: [
      { rawItemCode: 'AMU-BUTTER-500G', skuMaster: getSkuRef('AMU-BUTTER-500G'), invoicedQuantity: 100, unitPrice: 250, grossAmount: 25000, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });
  
  // Scenario 5: Insufficient (PO10005)
  await PurchaseOrder.create({
    poNumber: 'PO10005', status: 'processed', poDate: new Date('2024-01-15'), vendorName: 'Britannia', vendorCode: 'VND-005',
    items: [
      { rawItemCode: 'BRI-MARIE-250G', skuMaster: getSkuRef('BRI-MARIE-250G'), quantity: 200, unitPrice: 30, mrp: 35, uom: 'PCS', skuResolutionStatus: 'resolved' }
    ]
  });

  logger.info('Calculating match results...');
  const posToMatch = ['PO10001', 'PO10002', 'PO10003', 'PO10004', 'PO10005'];
  for (const poNumber of posToMatch) {
    await matchService.calculateMatch(poNumber);
  }

  logger.info('Seeding complete.');
  process.exit(0);
}

seedData().catch(err => {
  logger.error(err);
  process.exit(1);
});
