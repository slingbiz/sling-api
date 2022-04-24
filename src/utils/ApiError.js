class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    console.log(message, '[message]')
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
