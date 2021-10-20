'use strict';

const createError = require('http-errors');
const {
  InvalidTimeError,
  InvalidDateError,
  InvalidDateTimeError,
} = require('@strapi/database').errors;
const { ValidationError } = require('@strapi/utils').errors;

const formatApplicationError = error => {
  return {
    status: 400,
    body: {
      data: null,
      error: {
        status: 400,
        name: error.name,
        message: error.message,
        details: error.details,
      },
    },
  };
};

const formatHttpError = error => {
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

const formatInternalError = () => {
  const error = createError(500);
  return formatHttpError(error);
};

// TODO: To handle directly in the controllers
const passingDatabaseErrors = [InvalidTimeError, InvalidDateTimeError, InvalidDateError];

const formatDatabaseError = error => {
  if (passingDatabaseErrors.some(passingError => error instanceof passingError)) {
    const validationError = new ValidationError(error.message);
    return formatApplicationError(validationError);
  }

  return formatInternalError();
};

module.exports = {
  formatApplicationError,
  formatHttpError,
  formatInternalError,
  formatDatabaseError,
};
