const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/:poNumber', summaryController.getSummary);

module.exports = router;
