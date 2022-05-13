export default function getAPIInnerErrors(error, { getTrad }) {
  const errorPayload = error.response.data.error.details.errors;
  const validationErrors = errorPayload.reduce((acc, err) => {
    acc[err.path.join('.')] = {
      id: getTrad(`apiError.${err.message}`),
      defaultMessage: err.message,
      values: {
        field: err.path[err.path.length - 1],
      },
    };

    return acc;
  }, {});

  return validationErrors;
}
