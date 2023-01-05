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

export function normalizeAPIError(resError, intlMessagePrefixCallback) {
  const { error } = resError.response.data;

  // some errors carry multiple errors (such as ValidationError)
  if (error?.details?.errors) {
    const { errors } = error.details;

    const normalizedErrors = errors.reduce((acc, err) => {
      const path = err?.path.join('.');
      const { message } = err;

      acc[path] = {
        id: getPrefixedId(message, intlMessagePrefixCallback),
        defaultMessage: message,
      };

      // ValidationErrors expose a path about the affected field
      // formatMessage() needs the `field` information to properly
      // display error messages
      if (err.name === 'ValidationError') {
        if (path) {
          acc[path].values = {
            field: err.path[err.path.length - 1],
          };
        }
      }

      return acc;
    }, {});

    return {
      name: error.name,
      errors: normalizedErrors,
    };
  }

  const { message } = error;

  return {
    name: error.name,
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
  };
}
