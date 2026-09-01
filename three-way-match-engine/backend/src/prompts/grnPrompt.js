module.exports = `Extract the following GRN information as a JSON object:
- grnNumber: String
- grnDate: String (ISO format YYYY-MM-DD)
- poNumber: String
- items: Array of objects with fields:
  - rawItemCode: String
  - itemName: String
  - receivedQuantity: Number
  - unitPrice: Number
  - mrp: Number
  - uom: String
Ensure the output is valid JSON.`;
