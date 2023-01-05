function getPrefixedId(message, getTrad) {
  const errorPrefix = 'apiError.';
  const prefixedMessage = `${errorPrefix}${message}`;

  if (getTrad) {
    return getTrad(prefixedMessage);
  }

  return prefixedMessage;
}

export function normalizeAPIError(resError, getTrad) {
  const { error } = resError.response.data;

  switch (error.name) {
    case 'ValidationError': {
      const { errors } = error.details;

      const normalizedErrors = errors.reduce((acc, err) => {
        const path = err?.path.join('.');
        const { message } = err;

        acc[path] = {
          id: getPrefixedId(message, getTrad),
          defaultMessage: message,
          values: {
            field: err.path[err.path.length - 1],
          },
        };

        return acc;
      }, {});

      return {
        name: error.name,
        errors: normalizedErrors,
      };
    }

    default: {
      const { message } = error;

      return {
        name: error.name,
        id: getPrefixedId(message, getTrad),
        defaultMessage: message,
      };
    }
  }
}
