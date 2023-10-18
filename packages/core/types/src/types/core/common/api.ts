import type { Common } from '..';

export interface API extends Common.Module {}

export interface HttpError {
  status: number;
  name: string;
  message: string;
  details: unknown;
}

export interface ApplicationError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 400;
  name: 'ApplicationError';
  message: TMessage;
  details: TDetails;
}

export interface BadRequestError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 400;
  name: 'BadRequestError';
  message: TMessage;
  details: TDetails;
}

export interface ValidationError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 400;
  name: 'ValidationError';
  message: TMessage;
  details: TDetails;
}

interface YupFormattedError {
  path: string[];
  message: string;
  name: string;
}

export interface YupValidationError<
  TMessage extends string = string,
  TDetails = { errors: YupFormattedError }
> extends HttpError {
  status: 400;
  name: 'YupValidationError';
  message: TMessage;
  details: TDetails;
}

export interface PaginationError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 400;
  name: 'PaginationError';
  message: TMessage;
  details: TDetails;
}

export interface NotFoundError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 404;
  name: 'NotFoundError';
  message: TMessage;
  details: TDetails;
}

export interface ForbiddenError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 403;
  name: 'ForbiddenError';
  message: TMessage;
  details: TDetails;
}

export interface UnauthorizedError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 401;
  name: 'UnauthorizedError';
  message: TMessage;
  details: TDetails;
}

export interface RateLimitError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 429;
  name: 'RateLimitError';
  message: TMessage;
  details: TDetails;
}

export interface PayloadTooLargeError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 413;
  name: 'PayloadTooLargeError';
  message: TMessage;
  details: TDetails;
}

export interface PolicyError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 403;
  name: 'PolicyError';
  message: TMessage;
  details: TDetails;
}

export interface NotImplementedError<TMessage extends string = string, TDetails = unknown>
  extends HttpError {
  status: 501;
  name: 'NotImplementedError';
  message: TMessage;
  details: TDetails;
}
