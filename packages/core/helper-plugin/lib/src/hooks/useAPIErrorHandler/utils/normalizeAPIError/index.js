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

  return {
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
    name: error?.name ?? name,
    values: {
      path: fullPath,
    },
  };
}

export function normalizeAPIError(resError, intlMessagePrefixCallback) {
  const { error } = resError.response.data;

  // some errors carry multiple errors (such as ValidationError)
  if (error?.details?.errors) {
    return {
      name: error.name,
      errors: error.details.errors.reduce((acc, err) => {
        acc.push(normalizeError(err, { name: error.name, intlMessagePrefixCallback }));

        return acc;
      }, []),
    };
  }

  return normalizeError(error, { intlMessagePrefixCallback });
}
