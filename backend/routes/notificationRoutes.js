const express = require('express');
const { param } = require('express-validator');

const { listMine, markRead, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect, authorize('employee'));

router.get('/', listMine);
router.put('/read-all', markAllRead);
router.put('/:id/read', [param('id').isMongoId().withMessage('Invalid notification id.')], validate, markRead);

module.exports = router;