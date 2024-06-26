import { AxiosError } from 'axios';

import { normalizeAPIError } from './normalizeAPIError';

import type { ApiError } from '../types';
import type { MessageDescriptor } from 'react-intl';

interface GetAPIInnerErrorsOptions {
  getTrad: (id: string) => string;
}

/**
 *
 * Returns a normalized error message
 *
 * @deprecated
 * @preserve
 */
export function getAPIInnerErrors(
  error: AxiosError<{ error: ApiError }>,
  { getTrad }: GetAPIInnerErrorsOptions
) {
  const normalizedError = normalizeAPIError(error, getTrad);

  if (normalizedError && 'errors' in normalizedError) {
    return normalizedError.errors.reduce<Record<string, MessageDescriptor>>((acc, error) => {
      if ('path' in error.values) {
        acc[error.values.path] = {
          id: error.id,
          defaultMessage: error.defaultMessage,
        };
      }

      return acc;
    }, {});
  }

  return normalizedError?.defaultMessage;
}
