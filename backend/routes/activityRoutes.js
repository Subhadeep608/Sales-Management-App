const express = require('express');
const { listActivities } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Accessible to both roles; ownership is enforced inside the controller for employees.
router.get('/', protect, listActivities);

module.exports = router;
