import { normalizeAPIError } from './normalizeAPIError';

import type { FetchError } from '@strapi/admin/strapi-admin';
import type { MessageDescriptor } from 'react-intl';

type GetAPIInnerErrorsReturn = {
  [key: string]: MessageDescriptor;
};

/**
 *
 * Returns a normalized error message
 *
 */
export function getAPIInnerErrors(
  error: FetchError,
  { getTrad }: { getTrad: (key: string) => string }
) {
  const normalizedError = normalizeAPIError(error, getTrad);

  if (normalizedError && 'errors' in normalizedError) {
    return normalizedError.errors.reduce<GetAPIInnerErrorsReturn>((acc, error) => {
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
