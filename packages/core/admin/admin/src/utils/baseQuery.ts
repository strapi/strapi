import { SerializedError } from '@reduxjs/toolkit';
import { BaseQueryFn } from '@reduxjs/toolkit/query';

import { login as loginAction, logout as logoutAction } from '../reducer';
import { getFetchClient, type FetchOptions, ApiError, isFetchError } from '../utils/getFetchClient';

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

let refreshPromise: Promise<string> | null = null;

const isAuthPath = (url: string) => /^\/admin\/(login|logout|access-token)\b/.test(url);

const simpleQuery: BaseQueryFn<string | QueryArguments, unknown, BaseQueryError> = async (
  query,
  api
) => {
  const { signal, dispatch } = api as { signal?: AbortSignal; dispatch: (a: any) => void };

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
      // Attempt auto-refresh on 401 then retry once
      if (err.status === 401) {
        const url = typeof query === 'string' ? query : query.url;

        if (!isAuthPath(url)) {
          if (!refreshPromise) {
            async function refreshAccessToken(): Promise<string> {
              const { post } = getFetchClient();

              const res = await post('/admin/access-token');
              const token = res?.data?.data?.token as string | undefined;
              if (!token) {
                throw new Error('access_token_exchange_failed');
              }

              // Persist according to previous choice: localStorage presence implies persist
              const persist = Boolean(localStorage.getItem('jwtToken'));
              dispatch(loginAction({ token, persist }));

              return token;
            }

            refreshPromise = refreshAccessToken().finally(() => {
              refreshPromise = null;
            });
          }

          try {
            await refreshPromise;
            // Retry original request once with updated Authorization
            const retry = await executeQuery(query);

            return { data: retry.data };
          } catch (refreshError) {
            try {
              const { post } = getFetchClient();
              await post('/admin/logout');
            } catch {
              // no-op
            }

            dispatch(logoutAction());
            // Fall through to return the original 401 error shape
          }
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
