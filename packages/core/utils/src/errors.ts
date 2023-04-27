/* eslint-disable max-classes-per-file */

import yup from 'yup';
import { HttpError } from 'http-errors';
import { formatYupErrors } from './format-yup-error';

/* ApplicationError */
class ApplicationError extends Error {
  details: unknown;

  constructor(message: string, details: unknown = {}) {
    super();
    this.name = 'ApplicationError';
    this.message = message || 'An application error occured';
    this.details = details;
  }
}

class ValidationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'ValidationError';
  }
}

class YupValidationError extends ValidationError {
  constructor(yupError: yup.ValidationError, message: string) {
    super('Validation');
    const { errors, message: yupMessage } = formatYupErrors(yupError);
    this.message = message || yupMessage;
    this.details = { errors };
  }
}

class PaginationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'PaginationError';
    this.message = message || 'Invalid pagination';
  }
}

class NotFoundError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'NotFoundError';
    this.message = message || 'Entity not found';
  }
}

class ForbiddenError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'ForbiddenError';
    this.message = message || 'Forbidden access';
  }
}

class UnauthorizedError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'UnauthorizedError';
    this.message = message || 'Unauthorized';
  }
}

class RateLimitError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'RateLimitError';
    this.message = message || 'Too many requests, please try again later.';
    this.details = details || {};
  }
}

class PayloadTooLargeError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'PayloadTooLargeError';
    this.message = message || 'Entity too large';
  }
}

class PolicyError extends ForbiddenError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'PolicyError';
    this.message = message || 'Policy Failed';
    this.details = details || {};
  }
}

class NotImplementedError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'NotImplementedError';
    this.message = message || 'This feature is not implemented yet';
  }
}

export {
  HttpError,
  ApplicationError,
  ValidationError,
  YupValidationError,
  PaginationError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  RateLimitError,
  PayloadTooLargeError,
  PolicyError,
  NotImplementedError,
};
