import { toUpper, snakeCase, pick, isEmpty } from 'lodash/fp';
import { errors } from '@strapi/utils';
import { unwrapResolverError } from '@apollo/server/errors';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';

const { HttpError, ForbiddenError, UnauthorizedError, ApplicationError, ValidationError } = errors;

const formatToCode = (name: string) => `STRAPI_${toUpper(snakeCase(name))}`;
const formatErrorToExtension = (error: any) => ({
  error: pick(['name', 'message', 'details'])(error),
});

function createFormattedError(
  formattedError: GraphQLFormattedError,
  message: string,
  code: string,
  originalError: unknown
) {
  const options = {
    ...formattedError,
    extensions: {
      ...formattedError.extensions,
      ...formatErrorToExtension(originalError),
      code,
    },
  };

  return new GraphQLError(message, options);
}

/**
 * The handler for Apollo Server v4's formatError config option
 *
 * Intercepts specific Strapi error types to send custom error response codes in the GraphQL response
 */
export function formatGraphqlError(formattedError: GraphQLFormattedError, error: unknown) {
  const originalError = unwrapResolverError(error);

  // If this error doesn't have an associated originalError, it
  if (isEmpty(originalError)) {
    return formattedError;
  }

  const { message = '', name = 'UNKNOWN' } = originalError as Error;

  if (originalError instanceof ForbiddenError || originalError instanceof UnauthorizedError) {
    return createFormattedError(formattedError, message, 'FORBIDDEN', originalError);
  }

  if (originalError instanceof ValidationError) {
    return createFormattedError(formattedError, message, 'BAD_USER_INPUT', originalError);
  }

  if (originalError instanceof ApplicationError || originalError instanceof HttpError) {
    const errorName = formatToCode(name);
    return createFormattedError(formattedError, message, errorName, originalError);
  }

  if (originalError instanceof GraphQLError) {
    return formattedError;
  }

  // else if originalError doesn't appear to be from Strapi or GraphQL..

  // Log the error
  strapi.log.error(originalError);

  // Create a generic 500 to send so we don't risk leaking any data
  return createFormattedError(
    new GraphQLError('Internal Server Error'),
    'Internal Server Error',
    'INTERNAL_SERVER_ERROR',
    originalError
  );
}
