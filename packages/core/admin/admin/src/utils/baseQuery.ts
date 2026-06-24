import { SerializedError } from '@reduxjs/toolkit';
import { BaseQueryFn } from '@reduxjs/toolkit/query';

import {
  getFetchClient,
  triggerSessionExpired,
  type FetchOptions,
  ApiError,
  isFetchError,
} from '../utils/getFetchClient';

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

const isAuthPath = (url: string) => /^\/admin\/(login|logout|access-token)\b/.test(url);

const simpleQuery: BaseQueryFn<string | QueryArguments, unknown, BaseQueryError> = async (
  query,
  api
) => {
  const { signal } = api as { signal?: AbortSignal };

  const executeQuery = async (queryToExecute: string | QueryArguments) => {
    const { get, post, del, put } = getFetchClient();
    if (typeof queryToExecute === 'string') {
      const result = await get(queryToExecute, { signal });
      return result;
    }

    const { url, method = 'GET', data, config } = queryToExecute;
    if (method === 'POST') {
      return post(url, data, { ...config, signal });
    }
    if (method === 'DELETE') {
      return del(url, { ...config, signal });
    }
    if (method === 'PUT') {
      return put(url, data, { ...config, signal });
    }
    return get(url, { ...config, signal });
  };

  try {
    const result = await executeQuery(query);
    return { data: result.data };
  } catch (err) {
    // Handle error of type FetchError

    if (isFetchError(err)) {
      // If we receive a 401 here, getFetchClient already tried to refresh and failed.
      // Log the user out since their session is no longer valid.
      if (err.status === 401) {
        const url = typeof query === 'string' ? query : query.url;

        if (!isAuthPath(url)) {
          // Defer clearing auth state to AuthProvider so unsaved-change guards
          // can run before token removal (which unmounts edit forms).
          triggerSessionExpired();
        }
      }

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

const fetchBaseQuery = () => simpleQuery;

const isBaseQueryError = (error: BaseQueryError | SerializedError): error is BaseQueryError => {
  return error.name !== undefined;
};

export { fetchBaseQuery, isBaseQueryError };
export type { BaseQueryError, UnknownApiError, QueryArguments };
