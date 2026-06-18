function errorMiddleware(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError' || err.name === 'CastError') {
    statusCode = 400;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate key error';
  } else if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    statusCode = 401;
  }

  if (statusCode === 500) {
    console.error('[Server Error]', err);
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorMiddleware;
