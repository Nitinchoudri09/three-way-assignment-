const { PurchaseOrder, Grn, Invoice } = require('../models/Document');
const matchService = require('../services/matchService');
const { success } = require('../utils/response');

exports.getSummary = async (req, res, next) => {
  try {
    const poNumber = req.params.poNumber;
    
    const pos = await PurchaseOrder.find({ poNumber });
    const grns = await Grn.find({ poNumber });
    const invoices = await Invoice.find({ poNumber });
    
    const matchResult = await matchService.calculateMatch(poNumber);
    
    success(res, {
      poNumber,
      documents: {
        purchaseOrders: pos,
        grns,
        invoices
      },
      currentStatus: matchResult.status,
      summary: matchResult.summary
    });
  } catch (err) {
    next(err);
  }
};
