const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { STATUSES } = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

const formatUser = (user) => ({
  id: user._id,
  employeeId: user.employeeId,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const id = identifier.trim();

  const user = await User.findOne({
    $or: [{ employeeId: id.toUpperCase() }, { email: id.toLowerCase() }],
  }).select('+password');

  const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw new AppError('Invalid Employee ID or password.', 401);
  }
  if (user.status !== STATUSES.ACTIVE) {
    throw new AppError('Your account is deactivated. Please contact the admin.', 403);
  }

  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    token,
    user: formatUser(user),
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: formatUser(req.user) });
});

module.exports = { login, getMe };
