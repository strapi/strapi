import { getTrad } from '../../../utils';

export function handleAPIError(error) {
  const errorPayload = error.response.data.error.details.errors;
  const validationErrors = errorPayload.reduce((acc, err) => {
    acc[err.path.join('.')] = {
      id: getTrad(`apiError.${err.message}`),
      defaultMessage: err.message,
    };

    return acc;
  }, {});

  return validationErrors;
}
