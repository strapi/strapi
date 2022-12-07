import { toUpper, snakeCase, pick, isEmpty } from 'lodash/fp';
// @ts-ignore
import strapiUtils from '@strapi/utils';
import {
  ApolloError,
  UserInputError as ApolloUserInputError,
  ForbiddenError as ApolloForbiddenError,
} from 'apollo-server-koa';
import { GraphQLError } from 'graphql';

const { HttpError, ForbiddenError, UnauthorizedError, ApplicationError, ValidationError } =
  strapiUtils.errors;

const formatToCode = (name: string) => `STRAPI_${toUpper(snakeCase(name))}`;
const formatErrorToExtension = (error: any) => ({
  error: pick(['name', 'message', 'details'])(error),
});

const formatGraphqlError = (error: any) => {
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

export default formatGraphqlError;
