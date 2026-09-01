const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const upload = require('../middleware/upload');
const { validateUpload } = require('../validators/document');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/upload', upload.single('file'), validateUpload, documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocument);
router.get('/:id/file', documentController.getFile);

module.exports = router;
