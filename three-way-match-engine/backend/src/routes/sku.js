const express = require('express');
const router = express.Router();
const skuController = require('../controllers/skuController');
const { validateSku } = require('../validators/sku');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', skuController.listSkus);
router.post('/', validateSku, skuController.createSku);
router.patch('/:id', skuController.updateSku);
router.delete('/:id', skuController.deleteSku);

module.exports = router;
