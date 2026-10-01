const express = require('express');
const { query } = require('express-validator');
const { dailyReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get(
  '/daily',
  [query('date').optional({ checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be in YYYY-MM-DD format.')],
  validate,
  dailyReport
);

module.exports = router;