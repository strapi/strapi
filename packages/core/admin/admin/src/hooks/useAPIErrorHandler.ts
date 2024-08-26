import * as React from 'react';

import { IntlFormatters, useIntl } from 'react-intl';

import { FetchError } from '../utils/getFetchClient';
import { getPrefixedId } from '../utils/getPrefixedId';
import { NormalizeErrorOptions, normalizeAPIError } from '../utils/normalizeAPIError';
import { setIn } from '../utils/objects';

import type { errors } from '@strapi/utils';

type ApiError =
  | errors.ApplicationError
  | errors.ForbiddenError
  | errors.NotFoundError
  | errors.NotImplementedError
  | errors.PaginationError
  | errors.PayloadTooLargeError
  | errors.PolicyError
  | errors.RateLimitError
  | errors.UnauthorizedError
  | errors.ValidationError
  | errors.YupValidationError;

interface UnknownApiError {
  /**
   * The name of the ApiError, is always a static value.
   */
  name: 'UnknownError';
  /**
   * The error message.
   */
  message: string;
  /**
   * The error details.
   */
  details?: unknown;
  /**
   * The HTTP status code of the error.
   */
  status?: number;
}

/**
 * The last item is the fallback error SerializedError which
 * typically comes from redux-toolkit itself.
 */
interface SerializedError {
  /**
   * The name of the error.
   */
  name?: string;
  /**
   * The error message that explains what went wrong.
   */
  message?: string;
  /**
   * The stack trace of the error.
   */
  stack?: string;
  /**
   * A specific error code associated with the error.
   */
  code?: string;
}

/**
 * These are the types or errors we return
 * from the redux-toolkit data-fetching setup.
 */
type BaseQueryError = ApiError | UnknownApiError | SerializedError;

interface YupFormattedError {
  /**
   * An array representing the path to the field where the validation error occurred.
   */
  path: string[];
  /**
   * The error message describing the validation failure.
   */
  message: string;
  /**
   * The name of the error, typically identifies the type of validation error that occurred.
   */
  name: string;
}

/**
 * @public
 * @description The purpose of this hook is to offer a unified way to handle errors thrown by API endpoints, regardless of the type of error (`ValidationError`, `ApplicationErrror` ...)
that has been thrown.
 * @example
 * ```tsx
 * import * as React from 'react';
 * import { useFetchClient, useAPIErrorHandler, useNotification } from '@strapi/admin/admin';
 *
 * const MyComponent = () => {
 *   const { get } = useFetchClient();
 *   const { formatAPIError } = useAPIErrorHandler(getTrad);
 *   const { toggleNotification } = useNotification();
 *
 *   const handleDeleteItem = async () => {
 *     try {
 *       return await get('/admin');
 *     } catch (error) {
 *       toggleNotification({
 *         type: 'danger',
 *         message: formatAPIError(error),
 *       });
 *     }
 *   };
 *   return <button onClick={handleDeleteItem}>Delete item</button>;
 * };
 * ```
 */
export function useAPIErrorHandler(
  intlMessagePrefixCallback?: FormatAPIErrorOptions['intlMessagePrefixCallback']
) {
  const { formatMessage } = useIntl();

  /**
   * @description This method try to normalize the passed error
   * and then call formatAPIError to stringify the ResponseObject
   * into a string. If it fails it will call formatFetchError and
   * return the error message.
   */
  const formatError = React.useCallback(
    (error: FetchError) => {
      // Try to normalize the passed error first. This will fail for e.g. network
      // errors which are thrown by fetchClient directly.
      try {
        const formattedErr = formatAPIError(error, { intlMessagePrefixCallback, formatMessage });

        if (!formattedErr) {
          return formatFetchError(error, { intlMessagePrefixCallback, formatMessage });
        }

        return formattedErr;
      } catch (_) {
        throw new Error('formatAPIError: Unknown error:', error);
      }
    },
    [formatMessage, intlMessagePrefixCallback]
  );

  return {
    /**
     * @alpha
     * Convert ValidationErrors from the API into an object that can be used by forms.
     */
    _unstableFormatValidationErrors: React.useCallback(
      (error: Extract<BaseQueryError, { name: 'ValidationError' }>): Record<string, string> => {
        if (typeof error.details === 'object' && error.details !== null) {
          if ('errors' in error.details && Array.isArray(error.details.errors)) {
            const validationErrors = error.details.errors as YupFormattedError[];

            return validationErrors.reduce((acc, err) => {
              const { path, message } = err;

              return setIn(acc, path.join('.'), message);
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
      []
    ),
    /**
     * @alpha
     * This handles the errors given from `redux-toolkit`'s axios based baseQuery function.
     */
    _unstableFormatAPIError: React.useCallback(
      (error: BaseQueryError) => {
        const err = {
          response: {
            data: {
              error,
            },
          },
        } as FetchError;

        /**
         * There's a chance with SerializedErrors that the message is not set.
         * In that case we return a generic error message.
         */
        if (!error.message) {
          return 'Unknown error occured.';
        }

        return formatError(err);
      },
      [formatError]
    ),
    formatAPIError: formatError,
  };
}

function formatFetchError(
  error: FetchError,
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
 * @description This method stringifies the `ResponseObject` into
 * a string. If multiple errors are thrown by the API, which
 * happens e.g.in the case of a `ValidationError`, all errors
 * will bo concatenated into a single string.
 */
function formatAPIError(
  error: FetchError,
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
