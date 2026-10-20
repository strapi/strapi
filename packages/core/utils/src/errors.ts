/* eslint-disable max-classes-per-file */

import * as yup from 'yup';
import { HttpError } from 'http-errors';
import { formatYupErrors } from './format-yup-error';

/**
 * An app can load two copies of `@strapi/utils` (packages on different
 * versions), and `instanceof` fails between them. Each error records the ids
 * of its classes under a registry symbol, shared by every copy, so
 * `instanceof` can match on those instead.
 */
const CLASS_IDS = Symbol.for('strapi.errors.classIds');

// Fixed ids, not `constructor.name`, which a bundler may rename.
const classIds = new WeakMap<object, string>();

const getClassIds = (ErrorClass: unknown) => {
  const ids: string[] = [];

  for (let current = ErrorClass; current && current !== Error; ) {
    const id = classIds.get(current);

    if (id) {
      ids.push(id);
    }

    current = Object.getPrototypeOf(current);
  }

  return ids;
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

  static [Symbol.hasInstance](value: unknown): boolean {
    if (Function.prototype[Symbol.hasInstance].call(this, value)) {
      return true;
    }

    const id = classIds.get(this);

    if (!id || typeof value !== 'object' || value === null) {
      return false;
    }

    const ids = (value as { [CLASS_IDS]?: unknown })[CLASS_IDS];

    return Array.isArray(ids) && ids.includes(id);
  }

  constructor(
    message = 'An application error occurred' as TMessage,
    details: TDetails = {} as TDetails
  ) {
    super();
    this.name = 'ApplicationError' as TName;
    this.message = message;
    this.details = details;

    Object.defineProperty(this, CLASS_IDS, { value: getClassIds(new.target) });
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
  value: string;
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

const ERROR_CLASS_IDS: Array<[object, string]> = [
  [ApplicationError, 'ApplicationError'],
  [ValidationError, 'ValidationError'],
  [YupValidationError, 'YupValidationError'],
  [PaginationError, 'PaginationError'],
  [NotFoundError, 'NotFoundError'],
  [ForbiddenError, 'ForbiddenError'],
  [UnauthorizedError, 'UnauthorizedError'],
  [RateLimitError, 'RateLimitError'],
  [PayloadTooLargeError, 'PayloadTooLargeError'],
  [PolicyError, 'PolicyError'],
  [NotImplementedError, 'NotImplementedError'],
];

ERROR_CLASS_IDS.forEach(([ErrorClass, id]) => classIds.set(ErrorClass, id));

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
