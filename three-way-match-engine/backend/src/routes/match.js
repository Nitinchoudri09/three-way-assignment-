const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/:poNumber', matchController.getMatchResult);

module.exports = router;
