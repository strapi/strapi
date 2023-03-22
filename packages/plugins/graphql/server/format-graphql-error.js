'use strict';

const { toUpper, snakeCase, pick, isEmpty } = require('lodash/fp');
const { HttpError, ForbiddenError, UnauthorizedError, ApplicationError, ValidationError } =
  require('@strapi/utils').errors;
const {
  ApolloError,
  UserInputError: ApolloUserInputError,
  ForbiddenError: ApolloForbiddenError,
} = require('apollo-server-koa');
const { GraphQLError } = require('graphql');

const formatToCode = (name) => `STRAPI_${toUpper(snakeCase(name))}`;
const formatErrorToExtension = (error) => ({ error: pick(['name', 'message', 'details'])(error) });

const formatGraphqlError = (error) => {
  const { originalError } = error;

  if (isEmpty(originalError)) {
    return error;
  }

  if (originalError instanceof ForbiddenError || originalError instanceof UnauthorizedError) {
    return new ApolloForbiddenError(originalError.message, formatErrorToExtension(originalError));
  }

  if (originalError instanceof ValidationError) {
    return new ApolloUserInputError(originalError.message, formatErrorToExtension(originalError));
  }

  if (originalError instanceof ApplicationError || originalError instanceof HttpError) {
    const name = formatToCode(originalError.name);
    return new ApolloError(originalError.message, name, formatErrorToExtension(originalError));
  }

  if (originalError instanceof ApolloError || originalError instanceof GraphQLError) {
    return error;
  }

  // Internal server error
  strapi.log.error(originalError);
  return new ApolloError('Internal Server Error', 'INTERNAL_SERVER_ERROR');
};

module.exports = formatGraphqlError;
