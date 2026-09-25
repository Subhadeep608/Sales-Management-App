const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong.';
  let errors;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed.';
    errors = Object.values(err.errors).map((e) => e.message);
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `A record with this ${field} already exists.`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format.';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body.';
  } else if (err instanceof require('multer').MulterError) {
    statusCode = 400;
    message = err.message;
  }

  if (statusCode >= 500) {
    console.error('SERVER ERROR:', err);
    message = 'Something went wrong on the server. Please try again later.';
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) body.debug = err.message;

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
