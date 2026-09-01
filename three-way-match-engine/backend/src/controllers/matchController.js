const matchService = require('../services/matchService');
const { success } = require('../utils/response');

exports.getMatchResult = async (req, res, next) => {
  try {
    const result = await matchService.calculateMatch(req.params.poNumber);
    success(res, result);
  } catch (err) {
    next(err);
  }
};
