// temporary solution found from https://stackoverflow.com/a/41641001/10434847

import { ValidationError as ActualYupValidationError } from 'yup';

export namespace errors {
  export declare class ApplicationError<TDetails = unknown> extends Error {
    details: TDetails;

    constructor(message?: string, details?: TDetails);
  }

  export declare class ValidationError<TDetails = unknown> extends ApplicationError<TDetails> {
    constructor(message?: string, details?: unknown);
  }

  export interface YupFormattedError {
    path: string[];
    message: string;
    name: string;
  }
  export declare class YupValidationError extends ValidationError<{
    errors: Array<YupFormattedError>;
  }> {
    constructor(yupError: ActualYupValidationError, message?: string);
  }
  export declare class PaginationError extends ApplicationError {
    constructor(message?: string, details?: unknown);
  }
  export declare class NotFoundError extends ApplicationError {
    constructor(message?: string, details?: unknown);
  }
  export declare class ForbiddenError extends ApplicationError {
    constructor(message?: string, details?: unknown);
  }
  export declare class UnauthorizedError extends ApplicationError {
    constructor(message?: string, details?: unknown);
  }
  export declare class RateLimitError extends ApplicationError {
    constructor(message?: string, details?: unknown);
  }
  export declare class PayloadTooLargeError extends ApplicationError {
    constructor(message?: string, details?: unknown);
  }
  export declare class PolicyError extends ForbiddenError {
    constructor(message?: string, details?: unknown);
  }
  export declare class NotImplementedError extends ApplicationError {
    constructor(message?: string, details?: unknown);
  }
}
