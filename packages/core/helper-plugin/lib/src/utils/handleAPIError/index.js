export default function handleAPIError(resError, fallbackMessage = '', { getTrad } = {}) {
  const { error } = resError.response.data;

  switch (error.name) {
    case 'ValidationError':
      const { errors } = error.details;

      return errors.reduce((acc, err) => {
        const path = err?.path.join('.');
        const { message } = err;

        acc[path] = {
          id: getTrad ? getTrad(`apiError.${message}`) : `apiError.${message}`,
          defaultMessage: message,
          values: {
            field: err.path[err.path.length - 1],
          },
        };

        return acc;
      }, {});

    default:
      return error.message || fallbackMessage;
  }
}
