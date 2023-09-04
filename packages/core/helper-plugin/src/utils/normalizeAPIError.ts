import { AxiosError } from 'axios';

import { getPrefixedId } from './getPrefixedId';

export interface FormattedError {
  path: string[];
  message: string;
  name: string;
}

export interface Error {
  name: string;
  message: string;
  status: number;
  details: {
    errors?: FormattedError[];
  };
}

export interface ResponseError {
  data: unknown;
  error: Error;
}

type PrefixFn = (id: string) => string;

function normalizeError(
  error: FormattedError | Error,
  { name, intlMessagePrefixCallback }: { name?: string; intlMessagePrefixCallback?: PrefixFn }
) {
  const { message } = error;

  const normalizedError = {
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
    name: error.name ?? name,
    values: {},
  };

  if ('path' in error) {
    normalizedError.values = { path: error.path.join('.') };
  }

  return normalizedError;
}

export function normalizeAPIError(
  apiError: AxiosError<ResponseError>,
  intlMessagePrefixCallback?: PrefixFn
) {
  const error = apiError.response?.data.error;

  if (error) {
    // some errors carry multiple errors (such as ValidationError)
    if (error?.details?.errors) {
      return {
        name: error.name,
        message: error?.message || null,
        errors: error.details.errors.map((err: FormattedError) =>
          normalizeError(err, { name: error.name, intlMessagePrefixCallback })
        ),
      };
    }

    return normalizeError(error, { intlMessagePrefixCallback });
  }

  return null;
}
