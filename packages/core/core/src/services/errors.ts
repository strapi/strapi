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

const formatApplicationError = (error: InstanceType<typeof errors.ApplicationError>) => {
  const errorAndStatus = mapErrorsAndStatus.find((pair) => error instanceof pair.classError);
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

export { formatApplicationError, formatHttpError, formatInternalError };
