function getPrefixedId(message, callback) {
  const prefixedMessage = `apiError.${message}`;

  // if a prefix function has been passed in it is used to
  // prefix the id, e.g. to allow an error message to be
  // set only for a localization namespace
  if (typeof callback === 'function') {
    return callback(prefixedMessage);
  }

  return prefixedMessage;
}

function normalizeError(error, { name, intlMessagePrefixCallback }) {
  const { message } = error;

  const normalizedError = {
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
    name: error.name ?? name,
    values: {},
  };

  if ('path' in error) {
    normalizedError.values = { path: error.path.join('.') };
  }

  return normalizedError;
}

const validateErrorIsYupValidationError = (err) =>
  typeof err.details === 'object' && err.details !== null && 'errors' in err.details;

export function normalizeAPIError(apiError, intlMessagePrefixCallback) {
  const error = apiError.response?.data.error;

  if (error) {
    // some errors carry multiple errors (such as ValidationError)
    if (validateErrorIsYupValidationError(error)) {
      return {
        name: error.name,
        message: error?.message || null,
        errors: error.details.errors.map((err) =>
          normalizeError(err, { name: error.name, intlMessagePrefixCallback })
        ),
      };
    }

    return normalizeError(error, { intlMessagePrefixCallback });
  }

  return null;
}
