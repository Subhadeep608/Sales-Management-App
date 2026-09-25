const express = require('express');
const { param, body } = require('express-validator');

const {
    previewExcel,
    confirmImport,
    listImports,
    getImport,
    updateImport,
    deleteImportBatch,
} = require('../controllers/importController.js');
const { protect } = require('../middleware/authMiddleware.js');
const { authorize } = require('../middleware/roleMiddleware.js');
const validate = require('../middleware/validateMiddleware.js');
const upload = require('../middleware/uploadMiddleware.js');

const router = express.Router();

router.use(protect, authorize('admin'));

const idParam = [param('id').isMongoId().withMessage('Invalid import id.')];

router.post('/preview', upload.single('file'), previewExcel);
router.post('/confirm', confirmImport);
router.get('/', listImports);
router.get('/:id', idParam, validate, getImport);
router.put(
    '/:id',
    [...idParam, body('fileName').optional().trim().isLength({ min: 1, max: 255 }).withMessage('File name must be 1-255 characters.')],
    validate,
    updateImport
);
router.delete('/:id', idParam, validate, deleteImportBatch);

module.exports = router;