const express = require('express');
const { param, body, query } = require('express-validator');

const {
  myRecords,
  getMyRecord,
  updateMyRecord,
  myAssignedFiles,
  dailyWorkSummary,
} = require('../controllers/employeeRecordController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { STATUSES } = require('../models/Record');

const router = express.Router();

router.use(protect, authorize('employee'));

const idParam = [param('id').isMongoId().withMessage('Invalid record id.')];

// Static-path routes must come before '/:id' so they aren't parsed as an id.
router.get('/files', myAssignedFiles);
router.get(
  '/daily-summary',
  [query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be in YYYY-MM-DD format.')],
  validate,
  dailyWorkSummary
);
router.get('/', myRecords);
router.get('/:id', idParam, validate, getMyRecord);
router.put(
  '/:id',
  [
    ...idParam,
    body('status').optional().isIn(STATUSES),
    body('comment').optional().isString().isLength({ max: 2000 }),
    body('followUpDate').optional({ nullable: true }).isISO8601(),
  ],
  validate,
  updateMyRecord
);

module.exports = router;