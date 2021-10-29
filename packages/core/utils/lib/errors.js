'use strict';

const { HttpError } = require('http-errors');
const { formatYupErrors } = require('./format-yup-error');

/* ApplicationError */
class ApplicationError extends Error {
  constructor(message, details = {}) {
    super();
    this.name = 'ApplicationError';
    this.message = message || 'An application error occured';
    this.details = details;
  }
}

class ValidationError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'ValidationError';
  }
}

class YupValidationError extends ValidationError {
  constructor(yupError, message) {
    super();
    const { errors, message: yupMessage } = formatYupErrors(yupError);
    this.message = message || yupMessage;
    this.details = { errors };
  }
}

class PaginationError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'PaginationError';
    this.message = message || 'Invalid pagination';
  }
}

class NotFoundError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'NotFoundError';
    this.message = message || 'Entity not found';
  }
}

class ForbiddenError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'ForbiddenError';
    this.message = message || 'Forbidden access';
  }
}

class PayloadTooLargeError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'PayloadTooLargeError';
    this.message = message || 'Entity too large';
  }
}

class UnauthorizedError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'UnauthorizedError';
    this.message = message || 'Unauthorized';
  }
}

module.exports = {
  HttpError,
  ApplicationError,
  ValidationError,
  YupValidationError,
  PaginationError,
  NotFoundError,
  ForbiddenError,
  PayloadTooLargeError,
  UnauthorizedError,
};
