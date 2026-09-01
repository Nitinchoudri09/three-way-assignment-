const fs = require('fs');
const geminiService = require('./geminiService');
const skuService = require('./skuService');
const matchService = require('./matchService');
const { Document, PurchaseOrder, Grn, Invoice } = require('../models/Document');

exports.processUpload = async (file, documentType) => {
  const fileBuffer = fs.readFileSync(file.path);
  let extractedData;

  try {
    if (documentType === 'purchase_order') extractedData = await geminiService.parsePO(fileBuffer, file.mimetype);
    else if (documentType === 'grn') extractedData = await geminiService.parseGRN(fileBuffer, file.mimetype);
    else if (documentType === 'invoice') extractedData = await geminiService.parseInvoice(fileBuffer, file.mimetype);
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Data extraction error: ' + error.message);
    throw new Error('Data extraction failed: ' + error.message);
  }

  const { poNumber, items, ...restData } = extractedData;
  if (!poNumber) throw new Error('Could not extract poNumber from document');
  
  const resolvedItems = await skuService.resolveSkus(items || []);

  const docPayload = {
    poNumber,
    documentType,
    originalFileName: file.originalname,
    safeFileName: file.filename,
    filePath: file.path,
    mimeType: file.mimetype,
    status: 'processed',
    extractedData,
    items: resolvedItems,
    ...restData
  };

  let savedDoc;
  if (documentType === 'purchase_order') {
    const existing = await PurchaseOrder.findOne({ poNumber });
    if (existing) docPayload.isDuplicate = true;
    savedDoc = await PurchaseOrder.create(docPayload);
  } else if (documentType === 'grn') {
    const existing = await Grn.findOne({ poNumber, grnNumber: docPayload.grnNumber });
    if (existing) docPayload.isDuplicate = true;
    savedDoc = await Grn.create(docPayload);
  } else if (documentType === 'invoice') {
    const existing = await Invoice.findOne({ poNumber, invoiceNumber: docPayload.invoiceNumber });
    if (existing) docPayload.isDuplicate = true;
    savedDoc = await Invoice.create(docPayload);
  }

  const matchResult = await matchService.calculateMatch(poNumber);
  
  return { document: savedDoc, matchResult };
};
