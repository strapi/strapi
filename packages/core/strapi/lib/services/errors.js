'use strict';

const createError = require('http-errors');
const { NotFoundError, UnauthorizedError, ForbiddenError, PayloadTooLargeError } =
  require('@strapi/utils').errors;

const mapErrorsAndStatus = [
  {
    classError: UnauthorizedError,
    status: 401,
  },
  {
    classError: ForbiddenError,
    status: 403,
  },
  {
    classError: NotFoundError,
    status: 404,
  },
  {
    classError: PayloadTooLargeError,
    status: 413,
  },
];

const formatApplicationError = (error) => {
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

const formatHttpError = (error) => {
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

const formatInternalError = (error) => {
  const httpError = createError(error);

  if (httpError.expose) {
    return formatHttpError(httpError);
  }

  return formatHttpError(createError(httpError.status || 500));
};

module.exports = {
  formatApplicationError,
  formatHttpError,
  formatInternalError,
};
