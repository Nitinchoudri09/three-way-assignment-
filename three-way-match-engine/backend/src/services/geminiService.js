const { model, mockMode } = require('../config/gemini');
const poPrompt = require('../prompts/poPrompt');
const grnPrompt = require('../prompts/grnPrompt');
const invoicePrompt = require('../prompts/invoicePrompt');

const mockData = {
  po: {
    "poNumber": "PO10001", "poDate": "2024-01-15", "vendorName": "Bikaji Foods International Ltd", "vendorCode": "VND-001",
    "items": [
      { "rawItemCode": "BIK-BIKANERI-200G", "itemName": "Bikaji Bikaneri Bhujia 200G", "quantity": 100, "unitPrice": 45.00, "mrp": 50.00, "uom": "PCS" },
      { "rawItemCode": "BIK-ALOO-200G", "itemName": "Bikaji Aloo Bhujia 200G", "quantity": 50, "unitPrice": 40.00, "mrp": 45.00, "uom": "PCS" },
      { "rawItemCode": "HAL-SOAN-400G", "itemName": "Haldirams Soan Papdi 400G", "quantity": 30, "unitPrice": 110.00, "mrp": 120.00, "uom": "PCS" }
    ]
  },
  grn: {
    "grnNumber": "GRN001", "grnDate": "2024-01-20", "poNumber": "PO10001",
    "items": [
      { "rawItemCode": "BIK-BIKANERI-200G", "itemName": "Bikaji Bikaneri Bhujia 200G", "receivedQuantity": 95, "unitPrice": 45.00, "mrp": 50.00, "uom": "PCS" },
      { "rawItemCode": "BIK-ALOO-200G", "itemName": "Bikaji Aloo Bhujia 200G", "receivedQuantity": 50, "unitPrice": 40.00, "mrp": 45.00, "uom": "PCS" },
      { "rawItemCode": "HAL-SOAN-400G", "itemName": "Haldirams Soan Papdi 400G", "receivedQuantity": 30, "unitPrice": 110.00, "mrp": 120.00, "uom": "PCS" }
    ]
  },
  invoice: {
    "invoiceNumber": "INV001", "invoiceDate": "2024-01-22", "poNumber": "PO10001",
    "items": [
      { "rawItemCode": "BIK-BIKANERI-200G", "itemName": "Bikaji Bikaneri Bhujia 200G", "invoicedQuantity": 95, "unitPrice": 45.00, "mrp": 50.00, "uom": "PCS", "grossAmount": 4275.00 },
      { "rawItemCode": "BIK-ALOO-200G", "itemName": "Bikaji Aloo Bhujia 200G", "invoicedQuantity": 50, "unitPrice": 40.00, "mrp": 45.00, "uom": "PCS", "grossAmount": 2000.00 },
      { "rawItemCode": "HAL-SOAN-400G", "itemName": "Haldirams Soan Papdi 400G", "invoicedQuantity": 30, "unitPrice": 110.00, "mrp": 120.00, "uom": "PCS", "grossAmount": 3300.00 }
    ]
  }
};

async function callGemini(fileBuffer, mimeType, prompt) {
  let attempt = 0;
  while (attempt < 2) {
    try {
      console.log(`[GEMINI] Sending request to Gemini (Attempt ${attempt + 1})...`);
      const result = await model.generateContent([
        {
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType
          }
        },
        prompt
      ]);
      console.log(`[GEMINI] Received response from Gemini`);
      const text = result.response.text();
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error(`[GEMINI] Error on attempt ${attempt + 1}:`, error.message);
      attempt++;
      if (attempt >= 2) throw new Error('Failed to parse document with Gemini: ' + error.message);
    }
  }
}

exports.parsePO = async (fileBuffer, mimeType) => {
  if (mockMode) return mockData.po;
  return callGemini(fileBuffer, mimeType, poPrompt);
};

exports.parseGRN = async (fileBuffer, mimeType) => {
  if (mockMode) return mockData.grn;
  return callGemini(fileBuffer, mimeType, grnPrompt);
};

exports.parseInvoice = async (fileBuffer, mimeType) => {
  if (mockMode) return mockData.invoice;
  return callGemini(fileBuffer, mimeType, invoicePrompt);
};
