const AppError = require('../utils/AppError');

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authorized. Please log in.', 401));
  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

module.exports = { authorize };
