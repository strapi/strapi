const ERROR_PREFIX = 'apiError.';

function getPrefixedId(message, callback) {
  const prefixedMessage = `${ERROR_PREFIX}${message}`;

  // if a prefix function has been passed in it is used to
  // prefix the id, e.g. to allow an error message to be
  // set only for a localization namespace
  if (callback) {
    return callback(prefixedMessage);
  }

  return prefixedMessage;
}

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
