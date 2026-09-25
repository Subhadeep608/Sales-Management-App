const express = require('express');
const { body, param } = require('express-validator');

const {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  resetEmployeePassword,
} = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { PASSWORD_REGEX, PASSWORD_MESSAGE } = require('../utils/passwordPolicy');

const router = express.Router();

router.use(protect, authorize('admin')); // every route below is admin-only

const idParam = [param('id').isMongoId().withMessage('Invalid employee id.')];

router.post(
  '/',
  [
    body('employeeId').trim().matches(/^[A-Za-z0-9_-]{3,20}$/).withMessage('Employee ID must be 3-20 characters.'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.'),
    body('email').trim().isEmail().withMessage('A valid email is required.'),
    body('password').matches(PASSWORD_REGEX).withMessage(PASSWORD_MESSAGE),
  ],
  validate,
  createEmployee
);

router.get('/', listEmployees);
router.get('/:id', idParam, validate, getEmployee);

router.put(
  '/:id',
  [
    ...idParam,
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('email').optional().trim().isEmail(),
  ],
  validate,
  updateEmployee
);

router.put(
  '/:id/status',
  [...idParam, body('status').isIn(['active', 'inactive'])],
  validate,
  toggleEmployeeStatus
);

router.put(
  '/:id/reset-password',
  [...idParam, body('newPassword').matches(PASSWORD_REGEX).withMessage(PASSWORD_MESSAGE)],
  validate,
  resetEmployeePassword
);

module.exports = router;
