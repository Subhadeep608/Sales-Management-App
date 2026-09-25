const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
});

const loginRules = [
  body('identifier').isString().trim().notEmpty().withMessage('Employee ID or email is required.').isLength({ max: 100 }),
  body('password').isString().notEmpty().withMessage('Password is required.').isLength({ max: 128 }),
];

router.post('/login', loginLimiter, loginRules, validate, login);
router.get('/me', protect, getMe);

module.exports = router;
