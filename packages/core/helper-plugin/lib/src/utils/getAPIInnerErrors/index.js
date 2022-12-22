function getErrorPayload(error) {
  const response = error.response.data;

  if (['YupValidationError', 'ValidationError'].includes(response.error.name)) {
    return response.error.details.errors;
  }

  return [response.error];
}

export default function getAPIInnerErrors(error, { getTrad }) {
  return getErrorPayload(error).reduce((acc, err, index) => {
    const path = err?.path ? err?.path.join('.') : `${err.name}.${index}`;
    const { message } = err;

    acc[path] = {
      id: getTrad(`apiError.${message}`),
      defaultMessage: message,

      // Only errors of type YupValidationError contain a path
      values: err?.path
        ? {
            field: err.path[err.path.length - 1],
          }
        : undefined,
    };

    return acc;
  }, {});
}
