const express = require('express');
const { adminDashboard, employeeDashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/admin', protect, authorize('admin'), adminDashboard);
router.get('/employee', protect, authorize('employee'), employeeDashboard);

module.exports = router;
