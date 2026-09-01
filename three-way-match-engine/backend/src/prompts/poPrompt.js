module.exports = `Extract the following Purchase Order information as a JSON object:
- poNumber: String
- poDate: String (ISO format YYYY-MM-DD)
- vendorName: String
- vendorCode: String
- items: Array of objects with fields:
  - rawItemCode: String
  - itemName: String
  - quantity: Number
  - unitPrice: Number
  - mrp: Number
  - uom: String
Ensure the output is valid JSON.`;
