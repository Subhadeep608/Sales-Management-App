const express = require('express');
const { param, body } = require('express-validator');

const { listRecords, getRecord, updateRecord, deleteRecord, createManualRecord } = require('../controllers/recordController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

const idParam = [param('id').isMongoId().withMessage('Invalid record id.')];

router.get('/', listRecords);

router.post(
  '/manual',
  [
    body('customerName').trim().isLength({ min: 1, max: 150 }).withMessage('Customer name is required.'),
    body('phone').trim().isLength({ min: 1, max: 30 }).withMessage('Phone is required.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please enter a valid email.'),
    body('leadSource').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
    body('employeeId').isMongoId().withMessage('A valid employee must be selected.'),
  ],
  validate,
  createManualRecord
);

router.get('/:id', idParam, validate, getRecord);
router.put(
  '/:id',
  [
    ...idParam,
    body('customerName').optional().trim().isLength({ min: 1, max: 150 }),
    body('phone').optional().trim().isLength({ min: 1, max: 30 }),
    body('email').optional().trim(),
    body('leadSource').optional().trim().isLength({ max: 150 }),
  ],
  validate,
  updateRecord
);
router.delete('/:id', idParam, validate, deleteRecord);

module.exports = router;