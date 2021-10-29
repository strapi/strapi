'use strict';

const { toUpper, snakeCase } = require('lodash/fp');
const {
  HttpError,
  ForbiddenError,
  UnauthorizedError,
  ApplicationError,
  ValidationError,
} = require('@strapi/utils').errors;
const {
  ApolloError,
  UserInputError: ApolloUserInputError,
  ForbiddenError: ApolloForbiddenError,
} = require('apollo-server-errors');

const formatToCode = name => `STRAPI_${toUpper(snakeCase(name))}`;

const formatGraphqlError = error => {
  const originalError = error.originalError;

  if (originalError instanceof ApolloError) {
    return error;
  }

  if (originalError instanceof ForbiddenError || originalError instanceof UnauthorizedError) {
    return new ApolloForbiddenError(originalError.message, { details: originalError.details });
  }

  if (originalError instanceof ValidationError) {
    return new ApolloUserInputError(originalError.message, { details: originalError.details });
  }

  if (originalError instanceof ApplicationError || originalError instanceof HttpError) {
    const name = formatToCode(originalError.name);
    return new ApolloError(originalError.message, name, { details: originalError.details });
  }

  // Internal server error
  strapi.log.error(error);
  error.message = 'An error occured';
  return error;
};

module.exports = formatGraphqlError;
