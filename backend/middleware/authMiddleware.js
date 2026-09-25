const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { STATUSES } = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Not authorized. Please log in.', 401);
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    throw new AppError('Session expired or invalid. Please log in again.', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('User no longer exists.', 401);
  if (user.status !== STATUSES.ACTIVE) {
    throw new AppError('Your account is deactivated. Please contact the admin.', 403);
  }

  req.user = user;
  next();
});

module.exports = { protect };
