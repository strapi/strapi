import type { errors } from '@strapi/utils';
import type { MessageDescriptor, PrimitiveType } from 'react-intl';

export interface TranslationMessage extends MessageDescriptor {
  values?: Record<string, PrimitiveType>;
}

export type ApiError =
  | errors.ApplicationError
  | errors.ForbiddenError
  | errors.NotFoundError
  | errors.NotImplementedError
  | errors.PaginationError
  | errors.PayloadTooLargeError
  | errors.PolicyError
  | errors.RateLimitError
  | errors.UnauthorizedError
  | errors.ValidationError
  | errors.YupValidationError;

export type InputType =
  | 'json'
  | 'bool'
  | 'checkbox'
  | 'datetime'
  | 'date'
  | 'number'
  | 'email'
  | 'timestamp'
  | 'text'
  | 'string'
  | 'password'
  | 'select'
  | 'textarea'
  | 'time';
