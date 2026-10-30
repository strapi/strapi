/* eslint-disable max-classes-per-file */

import * as yup from 'yup';
import { HttpError } from 'http-errors';
import { formatYupErrors } from './format-yup-error';

/**
 * An app can load two copies of `@strapi/utils` (packages on different
 * versions), and `instanceof` fails between them. Each class brands its
 * prototype with a registry symbol, shared by every copy, so `instanceof` can
 * find the brand through the error's prototype chain instead.
 */
const BRAND_KEY = Symbol.for('strapi.errors.brandKey');

// Fixed ids, not `constructor.name`, which a bundler may rename.
const brand = (ErrorClass: { prototype: object }, id: string) => {
  const key = Symbol.for(`strapi.errors.class:${id}`);

  Object.defineProperty(ErrorClass, BRAND_KEY, { value: key });
  Object.defineProperty(ErrorClass.prototype, key, { value: true });
};

/* ApplicationError */
class ApplicationError<
  TName extends string = 'ApplicationError',
  TMessage extends string = string,
  TDetails = unknown,
> extends Error {
  name: TName;

  details: TDetails;

  message: TMessage;

  static {
    brand(this, 'ApplicationError');
  }

  static [Symbol.hasInstance](value: unknown): boolean {
    // A class declared outside Strapi has no brand of its own.
    if (!Object.hasOwn(this, BRAND_KEY)) {
      return Function.prototype[Symbol.hasInstance].call(this, value);
    }

    const key = (this as unknown as { [BRAND_KEY]: symbol })[BRAND_KEY];

    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<symbol, unknown>)[key] === true
    );
  }

  constructor(
    message = 'An application error occurred' as TMessage,
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
  static {
    brand(this, 'ValidationError');
  }

  constructor(message: TMessage, details?: TDetails) {
    super(message, details);
    this.name = 'ValidationError';
  }
}

interface YupFormattedError {
  path: string[];
  message: string;
  name: string;
  value: string;
}

class YupValidationError<TMessage extends string = string> extends ValidationError<
  TMessage,
  { errors: YupFormattedError[] }
> {
  static {
    brand(this, 'YupValidationError');
  }

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
  static {
    brand(this, 'PaginationError');
  }

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
  static {
    brand(this, 'NotFoundError');
  }

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
  static {
    brand(this, 'ForbiddenError');
  }

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
  static {
    brand(this, 'UnauthorizedError');
  }

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
  static {
    brand(this, 'RateLimitError');
  }

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
  static {
    brand(this, 'PayloadTooLargeError');
  }

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
  static {
    brand(this, 'PolicyError');
  }

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
  static {
    brand(this, 'NotImplementedError');
  }

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
