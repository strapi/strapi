import { getPrefixedId } from '../getPrefixedId';

function normalizeError(error, { name, intlMessagePrefixCallback }) {
  const { message, path } = error;

  return {
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
    name: error?.name ?? name,
    values: {
      path: path?.join('.'),
    },
  };
}

export function normalizeAPIError(apiError, intlMessagePrefixCallback) {
  const { error } = apiError.response.data;

  // some errors carry multiple errors (such as ValidationError)
  if (error?.details?.errors) {
    return {
      name: error.name,
      errors: error.details.errors.map((err) =>
        normalizeError(err, { name: error.name, intlMessagePrefixCallback })
      ),
    };
  }

  return normalizeError(error, { intlMessagePrefixCallback });
}
