import { SerializedError } from '@reduxjs/toolkit';
import { BaseQueryFn } from '@reduxjs/toolkit/query';

import { getFetchClient, isFetchError, type FetchOptions } from '../utils/getFetchClient';

import type { ApiError } from '../hooks/useAPIErrorHandler';

interface QueryArguments {
  url: string;
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
  data?: unknown;
  config?: FetchOptions;
}

interface UnknownApiError {
  name: 'UnknownError';
  message: string;
  details?: unknown;
  status?: number;
}

type BaseQueryError = ApiError | UnknownApiError;

const fetchBaseQuery =
  (): BaseQueryFn<string | QueryArguments, unknown, BaseQueryError> =>
  async (query, { signal }) => {
    try {
      const { get, post, del, put } = getFetchClient();

      if (typeof query === 'string') {
        const result = await get(query, { signal });
        return { data: result.data };
      } else {
        const { url, method = 'GET', data, config } = query;

        if (method === 'POST') {
          const result = await post(url, data, {
            ...config,
            signal,
          });
          return { data: result.data };
        }

        if (method === 'DELETE') {
          const result = await del(url, {
            ...config,
            signal,
          });
          return { data: result.data };
        }

        if (method === 'PUT') {
          const result = await put(url, data, {
            ...config,
            signal,
          });
          return { data: result.data };
        }

        /**
         * Default is GET.
         */
        const result = await get(url, {
          ...config,
          signal,
        });
        return { data: result.data };
      }
    } catch (err) {
      // Handle error of type FetchError

      if (isFetchError(err)) {
        if (
          typeof err.response?.data === 'object' &&
          err.response?.data !== null &&
          'error' in err.response?.data
        ) {
          /**
           * This will most likely be ApiError
           */
          return { data: undefined, error: err.response?.data.error as any };
        } else {
          return {
            data: undefined,
            error: {
              name: 'UnknownError',
              message: err.message,
              details: err.response,
              status: err.status,
            } as UnknownApiError,
          };
        }
      }

      const error = err as Error;
      return {
        data: undefined,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } satisfies SerializedError,
      };
    }
  };

const isBaseQueryError = (error: BaseQueryError | SerializedError): error is BaseQueryError => {
  return error.name !== undefined;
};

export { fetchBaseQuery, isBaseQueryError };
export type { BaseQueryError, UnknownApiError, QueryArguments };
