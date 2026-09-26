function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  const status = err.status || 500;
  const message = err.message || 'Something went wrong, please try again.';

  const response = { message };
  if (err.insufficientLines) {
    response.insufficientLines = err.insufficientLines;
  }

  res.status(status).json(response);
}

module.exports = errorHandler;
