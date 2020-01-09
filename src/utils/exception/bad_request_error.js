const ExtendableError = require('./expandable_error');
const httpStatus = require('http-status');

class BadRequestError extends ExtendableError {
  constructor (message, status = httpStatus.BAD_REQUEST, isPublic = true) {
    super(message, status, isPublic);
  }
}

module.exports = BadRequestError;
