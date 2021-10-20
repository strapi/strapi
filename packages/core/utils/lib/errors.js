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

class YupValidationError extends ApplicationError {
  constructor(yupError, message) {
    super();
    const { errors, message: yupMessage } = formatYupErrors(yupError);
    this.name = 'ValidationError';
    this.message = message || yupMessage;
    this.details = { errors };
  }
}

class PaginationError extends ApplicationError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = 'PaginationError';
    this.message = message || 'Invalid pagination';
  }
}

class QueryError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'QueryError';
  }
}

module.exports = {
  HttpError,
  ApplicationError,
  ValidationError,
  YupValidationError,
  PaginationError,
  QueryError,
};
