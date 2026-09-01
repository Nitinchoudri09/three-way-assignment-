const express = require('express');
const { login } = require('../controllers/authController');
const { listSkus, createSku, updateSku, deleteSku } = require('../controllers/skuController');
const { uploadDocument, getDocument, getDocumentFile, listDocuments } = require('../controllers/documentController');
const { getMatch, getSummary, getDashboard, getPurchaseOrder } = require('../controllers/matchController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/auth/login', login);

router.use(auth);

router.get('/dashboard', getDashboard);
router.get('/purchase-orders/:poNumber', getPurchaseOrder);

router.post('/documents/upload', upload.single('file'), uploadDocument);
router.get('/documents/:id/file', getDocumentFile);
router.get('/documents/:id', getDocument);
router.get('/documents', listDocuments);

router.get('/match/:poNumber', getMatch);
router.get('/summary/:poNumber', getSummary);

router.get('/masters/sku', listSkus);
router.post('/masters/sku', createSku);
router.patch('/masters/sku/:id', updateSku);
router.delete('/masters/sku/:id', deleteSku);

module.exports = router;
