import { toUpper, snakeCase, pick, isEmpty } from 'lodash/fp';
import { errors } from '@strapi/utils';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';

import type { Core } from '@strapi/types';

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
 * Maps an already-unwrapped resolver error to Strapi GraphQL error extensions.
 * Use with Apollo via {@link createApolloFormatErrorHandler} or pass `originalError` from another engine.
 */
export function formatStrapiGraphqlError(
  strapi: Core.Strapi,
  formattedError: GraphQLFormattedError,
  originalError: unknown
): GraphQLFormattedError | GraphQLError {
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

  strapi.log.error(originalError);

  return createFormattedError(
    new GraphQLError('Internal Server Error'),
    'Internal Server Error',
    'INTERNAL_SERVER_ERROR',
    originalError
  );
}
