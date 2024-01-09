import { toUpper, snakeCase, pick, isEmpty } from 'lodash/fp';
import { errors } from '@strapi/utils';
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
  return {
    ...formattedError,
    message,
    extensions: { ...formattedError.extensions, ...formatErrorToExtension(originalError), code },
  };
}

export function formatGraphqlError(formattedError: GraphQLFormattedError, originalError: unknown) {
  if (isEmpty(originalError)) {
    return formattedError;
  }

  const { message = null, name = null } = originalError as any;

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
  // Internal server error
  strapi.log.error(originalError);

  return createFormattedError(
    new GraphQLError('Internal Server Error'),
    'Internal Server Error',
    'INTERNAL_SERVER_ERROR',
    originalError
  );
}
