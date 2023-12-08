import { getTranslation } from '../../../utils/translations';

import type { ApiError, TranslationMessage } from '@strapi/helper-plugin';
import type { AxiosError } from 'axios';

const getAPIInnerError = (error: AxiosError<{ error: ApiError }>) => {
  if (
    error.response &&
    typeof error.response.data.error.details === 'object' &&
    error.response.data.error.details !== null &&
    'errors' in error.response.data.error.details &&
    Array.isArray(error.response.data.error.details.errors)
  ) {
    const errorPayload = error.response.data.error.details.errors;
    const validationErrors = errorPayload.reduce<Record<string, TranslationMessage>>((acc, err) => {
      acc[err.path.join('.')] = {
        id: getTranslation(`apiError.${err.message}`),
        defaultMessage: err.message,
        values: {
          field: err.path[err.path.length - 1],
        },
      };

      return acc;
    }, {});

    return validationErrors;
  }

  return {};
};

export { getAPIInnerError };
