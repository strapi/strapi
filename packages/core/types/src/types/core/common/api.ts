import type { Common } from '..';

export interface API extends Common.Module {}

export interface HttpError<TDetails = unknown> {
  status: number;
  name: string;
  message: string;
  details: TDetails;
}

export interface ApplicationError<TDetails = unknown> extends HttpError<TDetails> {
  status: 400;
  name: 'ApplicationError';
  message: string;
  details: TDetails;
}

export interface BadRequestError<TDetails = unknown> extends HttpError<TDetails> {
  status: 400;
  name: 'BadRequestError';
  message: string;
  details: TDetails;
}

export interface ValidationError<TDetails = unknown> extends HttpError<TDetails> {
  status: 400;
  name: 'ValidationError';
  message: string;
  details: TDetails;
}

export interface YupValidationError<TDetails = unknown> extends HttpError<TDetails> {
  status: 400;
  name: 'YupValidationError';
  message: string;
  details: TDetails;
}

export interface PaginationError<TDetails = unknown> extends HttpError<TDetails> {
  status: 400;
  name: 'PaginationError';
  message: string;
  details: TDetails;
}

export interface NotFoundError<TDetails = unknown> extends HttpError<TDetails> {
  status: 404;
  name: 'NotFoundError';
  message: string;
  details: TDetails;
}

export interface ForbiddenError<TDetails = unknown> extends HttpError<TDetails> {
  status: 403;
  name: 'ForbiddenError';
  message: string;
  details: TDetails;
}

export interface UnauthorizedError<TDetails = unknown> extends HttpError<TDetails> {
  status: 401;
  name: 'UnauthorizedError';
  message: string;
  details: TDetails;
}

export interface RateLimitError<TDetails = unknown> extends HttpError<TDetails> {
  status: 429;
  name: 'RateLimitError';
  message: string;
  details: TDetails;
}

export interface PayloadTooLargeError<TDetails = unknown> extends HttpError<TDetails> {
  status: 413;
  name: 'PayloadTooLargeError';
  message: string;
  details: TDetails;
}

export interface PolicyError<TDetails = unknown> extends HttpError<TDetails> {
  status: 403;
  name: 'PolicyError';
  message: string;
  details: TDetails;
}

export interface NotImplementedError<TDetails = unknown> extends HttpError<TDetails> {
  status: 501;
  name: 'NotImplementedError';
  message: string;
  details: TDetails;
}
