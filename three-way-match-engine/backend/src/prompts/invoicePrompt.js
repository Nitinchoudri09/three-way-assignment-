module.exports = `Extract the following Invoice information as a JSON object:
- invoiceNumber: String
- invoiceDate: String (ISO format YYYY-MM-DD)
- poNumber: String
- items: Array of objects with fields:
  - rawItemCode: String
  - itemName: String
  - invoicedQuantity: Number
  - unitPrice: Number
  - mrp: Number
  - uom: String
  - grossAmount: Number
Ensure the output is valid JSON.`;
