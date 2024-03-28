/* eslint-disable max-classes-per-file */

import yup from 'yup';
import { HttpError } from 'http-errors';
import { formatYupErrors } from './format-yup-error';

/* ApplicationError */
class ApplicationError<
  TName extends string = 'ApplicationError',
  TMessage extends string = string,
  TDetails = unknown,
> extends Error {
  name: TName;

  details: TDetails;

  message: TMessage;

  constructor(
    message = 'An application error occured' as TMessage,
    details: TDetails = {} as TDetails
  ) {
    super();
    this.name = 'ApplicationError' as TName;
    this.message = message;
    this.details = details;
  }
}

class ValidationError<
  TMessage extends string = string,
  TDetails = unknown,
> extends ApplicationError<'ValidationError', TMessage, TDetails> {
  constructor(message: TMessage, details?: TDetails) {
    super(message, details);
    this.name = 'ValidationError';
  }
}

interface YupFormattedError {
  path: string[];
  message: string;
  name: string;
}

class YupValidationError<TMessage extends string = string> extends ValidationError<
  TMessage,
  { errors: YupFormattedError[] }
> {
  constructor(yupError: yup.ValidationError, message?: TMessage) {
    super('Validation' as TMessage);
    const { errors, message: yupMessage } = formatYupErrors(yupError);
    this.message = message || (yupMessage as TMessage);
    this.details = { errors };
  }
}

class PaginationError<
  TMessage extends string = string,
  TDetails = unknown,
> extends ApplicationError<'PaginationError', TMessage, TDetails> {
  constructor(message = 'Invalid pagination' as TMessage, details?: TDetails) {
    super(message, details);
    this.name = 'PaginationError';
    this.message = message;
  }
}

class NotFoundError<TMessage extends string = string, TDetails = unknown> extends ApplicationError<
  'NotFoundError',
  TMessage,
  TDetails
> {
  constructor(message = 'Entity not found' as TMessage, details?: TDetails) {
    super(message, details);
    this.name = 'NotFoundError';
    this.message = message;
  }
}

class ForbiddenError<
  TName extends string = 'ForbiddenError',
  TMessage extends string = string,
  TDetails = unknown,
> extends ApplicationError<TName, TMessage, TDetails> {
  constructor(message = 'Forbidden access' as TMessage, details?: TDetails) {
    super(message, details);
    this.name = 'ForbiddenError' as TName;
    this.message = message;
  }
}

class UnauthorizedError<
  TMessage extends string = string,
  TDetails = unknown,
> extends ApplicationError<'UnauthorizedError', TMessage, TDetails> {
  constructor(message = 'Unauthorized' as TMessage, details?: TDetails) {
    super(message, details);
    this.name = 'UnauthorizedError';
    this.message = message;
  }
}

class RateLimitError<TMessage extends string = string, TDetails = unknown> extends ApplicationError<
  'RateLimitError',
  TMessage,
  TDetails
> {
  constructor(
    message = 'Too many requests, please try again later.' as TMessage,
    details?: TDetails
  ) {
    super(message, details);
    this.name = 'RateLimitError';
    this.message = message;
    this.details = details || ({} as TDetails);
  }
}

class PayloadTooLargeError<
  TMessage extends string = string,
  TDetails = unknown,
> extends ApplicationError<'PayloadTooLargeError', TMessage, TDetails> {
  constructor(message = 'Entity too large' as TMessage, details?: TDetails) {
    super(message, details);
    this.name = 'PayloadTooLargeError';
    this.message = message;
  }
}

class PolicyError<TMessage extends string = string, TDetails = unknown> extends ForbiddenError<
  'PolicyError',
  TMessage,
  TDetails
> {
  constructor(message = 'Policy Failed' as TMessage, details?: TDetails) {
    super(message, details);
    this.name = 'PolicyError';
    this.message = message;
    this.details = details || ({} as TDetails);
  }
}

class NotImplementedError<
  TMessage extends string = string,
  TDetails = unknown,
> extends ApplicationError<'NotImplementedError', TMessage, TDetails> {
  constructor(message = 'This feature is not implemented yet' as TMessage, details?: TDetails) {
    super(message, details);
    this.name = 'NotImplementedError';
    this.message = message;
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
