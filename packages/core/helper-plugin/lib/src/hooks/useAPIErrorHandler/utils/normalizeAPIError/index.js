function getPrefixedId(message, callback) {
  const errorPrefix = 'apiError.';
  const prefixedMessage = `${errorPrefix}${message}`;

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
  const fullPath = path?.join('.');
  const body = {
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
    name: error?.name ?? name,
  };

  const normalizedError = fullPath
    ? {
        [fullPath]: body,
      }
    : body;

  // ValidationErrors expose a path about the affected field
  // formatMessage() needs the `field` information to properly
  // display error messages
  if ((error?.name === 'ValidationError' || name === 'ValidationError') && fullPath) {
    normalizedError[fullPath].values = {
      field: error.path[error.path.length - 1],
    };
  }

  return normalizedError;
}

export function normalizeAPIError(resError, intlMessagePrefixCallback) {
  const { error } = resError.response.data;

  // some errors carry multiple errors (such as ValidationError)
  if (error?.details?.errors) {
    return {
      name: error.name,
      errors: error.details.errors.reduce((acc, err) => {
        acc = {
          ...acc,
          ...normalizeError(err, { name: error.name, intlMessagePrefixCallback }),
        };

        return acc;
      }, {}),
    };
  }

  return normalizeError(error, { intlMessagePrefixCallback });
}
