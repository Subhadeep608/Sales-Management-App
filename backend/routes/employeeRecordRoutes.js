const express = require('express');
const { param, body, query } = require('express-validator');

const {
  myRecords,
  getMyRecord,
  updateMyRecord,
  myAssignedFiles,
  dailyWorkSummary,
  myReport,
  createMyManualRecord,
  myFollowUps,
} = require('../controllers/employeeRecordController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { STATUSES } = require('../models/Record');

const router = express.Router();

router.use(protect, authorize('employee'));

const idParam = [param('id').isMongoId().withMessage('Invalid record id.')];

router.get('/files', myAssignedFiles);
router.get(
  '/daily-summary',
  [query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be in YYYY-MM-DD format.')],
  validate,
  dailyWorkSummary
);
router.get(
  '/report',
  [
    query('date').optional({ checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be in YYYY-MM-DD format.'),
    query('status').optional({ checkFalsy: true }).isIn(STATUSES),
    query('search').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
  ],
  validate,
  myReport
);
router.post(
  '/manual',
  [
    body('customerName').trim().isLength({ min: 1, max: 150 }).withMessage('Customer name is required.'),
    body('phone').trim().isLength({ min: 1, max: 30 }).withMessage('Phone is required.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please enter a valid email.'),
    body('leadSource').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  ],
  validate,
  createMyManualRecord
);
router.get('/', myRecords);
router.get(
  '/follow-ups',
  [query('date').optional({ checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be in YYYY-MM-DD format.')],
  validate,
  myFollowUps
);
router.get('/:id', idParam, validate, getMyRecord);
router.put(
  '/:id',
  [
    ...idParam,
    body('customerName').optional().trim().isLength({ min: 1, max: 150 }),
    body('phone').optional().trim().isLength({ min: 1, max: 30 }),
    body('email').optional().trim(),
    body('status').optional().isIn(STATUSES),
    body('comment').optional().isString().isLength({ max: 2000 }),
    body('followUpDate').optional({ nullable: true }).isISO8601(),
  ],
  validate,
  updateMyRecord
);

module.exports = router;