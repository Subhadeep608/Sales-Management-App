const express = require('express');
const { param, body } = require('express-validator');

const { listRecords, getRecord, updateRecord, deleteRecord } = require('../controllers/recordController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

const idParam = [param('id').isMongoId().withMessage('Invalid record id.')];

router.get('/', listRecords);
router.get('/:id', idParam, validate, getRecord);
router.put(
  '/:id',
  [
    ...idParam,
    body('customerName').optional().trim().isLength({ min: 1, max: 150 }),
    body('phone').optional().trim().isLength({ min: 1, max: 30 }),
    body('email').optional().trim(),
  ],
  validate,
  updateRecord
);
router.delete('/:id', idParam, validate, deleteRecord);

module.exports = router;
