const express = require('express');
const { param, body } = require('express-validator');

const {
  previewExcel,
  confirmImport,
  listImports,
  getImport,
  updateImport,
  deleteImportBatch,
} = require('../controllers/importController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

const idParam = [param('id').isMongoId().withMessage('Invalid import id.')];

router.post('/preview', upload.single('file'), previewExcel);
router.post(
  '/confirm',
  [body('leadSource').trim().notEmpty().withMessage('Lead source is required.').isLength({ max: 150 })],
  validate,
  confirmImport
);
router.get('/', listImports);
router.get('/:id', idParam, validate, getImport);
router.put(
  '/:id',
  [...idParam, body('fileName').optional().trim().isLength({ min: 1, max: 255 })],
  validate,
  updateImport
);
router.delete('/:id', idParam, validate, deleteImportBatch);

module.exports = router;