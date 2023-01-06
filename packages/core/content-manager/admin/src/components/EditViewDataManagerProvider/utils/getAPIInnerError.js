import { getTrad } from '../../../utils';

export function getAPIInnerError(error) {
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
