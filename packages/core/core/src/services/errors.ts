import createError from 'http-errors';
import { errors } from '@strapi/utils';

const mapErrorsAndStatus = [
  {
    classError: errors.UnauthorizedError,
    status: 401,
  },
  {
    classError: errors.ForbiddenError,
    status: 403,
  },
  {
    classError: errors.NotFoundError,
    status: 404,
  },
  {
    classError: errors.PayloadTooLargeError,
    status: 413,
  },
  {
    classError: errors.RateLimitError,
    status: 429,
  },
  {
    classError: errors.NotImplementedError,
    status: 501,
  },
];

type ApplicationErrorClass = new (...args: never[]) => InstanceType<typeof errors.ApplicationError>;

const applicationErrorsByName = new Map<string, ApplicationErrorClass>([
  ['ApplicationError', errors.ApplicationError],
  ['ValidationError', errors.ValidationError],
  ['PaginationError', errors.PaginationError],
  ['NotFoundError', errors.NotFoundError],
  ['ForbiddenError', errors.ForbiddenError],
  ['UnauthorizedError', errors.UnauthorizedError],
  ['RateLimitError', errors.RateLimitError],
  ['PayloadTooLargeError', errors.PayloadTooLargeError],
  ['PolicyError', errors.PolicyError],
  ['NotImplementedError', errors.NotImplementedError],
]);

/**
 * Like `instanceof`, but also matches errors thrown by another copy of `@strapi/utils`
 * (a dependency on a different version), whose classes are not core's.
 */
const isStrapiError = <TClass extends ApplicationErrorClass>(
  error: unknown,
  ErrorClass: TClass
): error is InstanceType<TClass> => {
  if (error instanceof ErrorClass) {
    return true;
  }

  if (!(error instanceof Error) || !('details' in error)) {
    return false;
  }

  const LocalClass = applicationErrorsByName.get(error.name);

  return (
    LocalClass !== undefined &&
    (LocalClass === ErrorClass || LocalClass.prototype instanceof ErrorClass)
  );
};

const formatApplicationError = (error: InstanceType<typeof errors.ApplicationError>) => {
  const errorAndStatus = mapErrorsAndStatus.find((pair) => isStrapiError(error, pair.classError));
  const status = errorAndStatus ? errorAndStatus.status : 400;

  return {
    status,
    body: {
      data: null,
      error: {
        status,
        name: error.name,
        message: error.message,
        details: error.details,
      },
    },
  };
};

const formatHttpError = (error: createError.HttpError) => {
  return {
    status: error.status,
    body: {
      data: null,
      error: {
        status: error.status,
        name: error.name,
        message: error.message,
        details: error.details,
      },
    },
  };
};

const formatInternalError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return formatHttpError(createError(500));
  }

  const httpError = createError(error);

  if (httpError.expose) {
    return formatHttpError(httpError);
  }

  return formatHttpError(createError(httpError.status || 500));
};

export { formatApplicationError, formatHttpError, formatInternalError, isStrapiError };
