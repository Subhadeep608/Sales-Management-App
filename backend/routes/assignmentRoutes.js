const express = require('express');
const { body } = require('express-validator');

const { assignRecords, assignByFilter, listAssignmentHistory } = require('../controllers/assignmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

router.post(
  '/',
  [
    body('recordIds').isArray({ min: 1 }).withMessage('At least one record must be selected.'),
    body('employeeId').isMongoId().withMessage('A valid employee must be selected.'),
  ],
  validate,
  assignRecords
);

router.post(
  '/bulk-by-filter',
  [body('employeeId').isMongoId().withMessage('A valid employee must be selected.')],
  validate,
  assignByFilter
);

router.get('/', listAssignmentHistory);

module.exports = router;
