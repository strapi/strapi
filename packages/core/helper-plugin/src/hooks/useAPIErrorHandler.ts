import { AxiosError } from 'axios';
import { IntlFormatters, useIntl } from 'react-intl';

import { ApiError } from '../types';
import { getPrefixedId } from '../utils/getPrefixedId';
import { NormalizeErrorOptions, normalizeAPIError } from '../utils/normalizeAPIError';

interface UnknownApiError {
  name: 'UnknownError';
  message: string;
  details?: unknown;
  status?: number;
}

/**
 * The last item is the fallback error SerializedError which
 * typically comes from redux-toolkit itself.
 */
interface SerializedError {
  name?: string;
  message?: string;
  stack?: string;
  code?: string;
}

/**
 * These are the types or errors we return
 * from the redux-toolkit data-fetching setup.
 */

type BaseQueryError = ApiError | UnknownApiError | SerializedError;

interface YupFormattedError {
  path: string[];
  message: string;
  name: string;
}

/**
 * Hook that exports an error message formatting function.
 */
export function useAPIErrorHandler(
  intlMessagePrefixCallback?: FormatAPIErrorOptions['intlMessagePrefixCallback']
) {
  const { formatMessage } = useIntl();

  const formatError = (error: AxiosError<{ error: ApiError }>) => {
    // Try to normalize the passed error first. This will fail for e.g. network
    // errors which are thrown by Axios directly.
    try {
      const formattedErr = formatAPIError(error, { intlMessagePrefixCallback, formatMessage });

      if (!formattedErr) {
        return formatAxiosError(error, { intlMessagePrefixCallback, formatMessage });
      }

      return formattedErr;
    } catch (_) {
      throw new Error('formatAPIError: Unknown error:', error);
    }
  };

  return {
    /**
     * @alpha
     * Convert ValidationErrors from the API into an object that can be used by forms.
     */
    _unstableFormatValidationErrors: (
      error: Extract<BaseQueryError, { name: 'ValidationError' }>
    ): Record<string, string> => {
      if (typeof error.details === 'object' && error.details !== null) {
        if ('errors' in error.details && Array.isArray(error.details.errors)) {
          const validationErrors = error.details.errors as YupFormattedError[];

          return validationErrors.reduce((acc, err) => {
            const { path, message } = err;

            return {
              ...acc,
              [path.join('.')]: message,
            };
          }, {});
        } else {
          const details = error.details as Record<string, string[]>;

          return Object.keys(details).reduce((acc, key) => {
            const messages = details[key];

            return {
              ...acc,
              [key]: messages.join(', '),
            };
          }, {});
        }
      } else {
        return {};
      }
    },
    /**
     * @alpha
     * This handles the errors given from `redux-toolkit`'s axios based baseQuery function.
     */
    _unstableFormatAPIError: (error: BaseQueryError) => {
      const err = {
        response: {
          data: {
            error,
          },
        },
      } as AxiosError<{ error: BaseQueryError }>;

      /**
       * There's a chance with SerializedErrors that the message is not set.
       * In that case we return a generic error message.
       */
      if (!error.message) {
        return 'Unknown error occured.';
      }

      // @ts-expect-error – UnknownApiError is in the same shape as ApiError, but we don't want to expose this to users yet.
      return formatError(err);
    },
    formatAPIError: formatError,
  };
}

function formatAxiosError(
  error: AxiosError<unknown>,
  { intlMessagePrefixCallback, formatMessage }: FormatAPIErrorOptions
) {
  const { code, message } = error;

  return formatMessage(
    {
      id: getPrefixedId(message, intlMessagePrefixCallback),
      defaultMessage: message,
    },
    {
      code,
    }
  );
}

type FormatAPIErrorOptions = Partial<Pick<NormalizeErrorOptions, 'intlMessagePrefixCallback'>> &
  Pick<IntlFormatters, 'formatMessage'>;

/**
 * Method to stringify an API error object
 */
function formatAPIError(
  error: AxiosError<{ error: ApiError }>,
  { formatMessage, intlMessagePrefixCallback }: FormatAPIErrorOptions
) {
  if (!formatMessage) {
    throw new Error('The formatMessage callback is a mandatory argument.');
  }

  const normalizedError = normalizeAPIError(error, intlMessagePrefixCallback);

  if (!normalizedError) {
    return null;
  }

  if ('message' in normalizedError && normalizedError.message !== null) {
    return normalizedError.message;
  }

  // stringify multiple errors
  if ('errors' in normalizedError) {
    return normalizedError.errors
      .map(({ id, defaultMessage, values }) => formatMessage({ id, defaultMessage }, values))
      .join('\n');
  }

  return formatMessage(normalizedError);
}

export type { ApiError };
