import qs from 'qs';

import type { ApiError } from '../hooks/useAPIErrorHandler';

const STORAGE_KEYS = {
  TOKEN: 'jwtToken',
  USER: 'userInfo',
};

type FetchParams = Parameters<typeof fetch>;
type FetchURL = FetchParams[0];

export type FetchResponse<TData = unknown> = {
  data: TData;
};

export type FetchOptions = {
  params?: any;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export type FetchConfig = {
  baseURL?: string;
  signal?: AbortSignal;
};

type ErrorResponse = {
  data: any;
  error: ApiError & { status?: number };
};

export class FetchError extends Error {
  public name: string;
  public message: string;
  public response?: ErrorResponse;
  public code?: number;
  public status?: number;

  constructor(message: string, response?: ErrorResponse) {
    super(message);
    this.name = 'FetchError';
    this.message = message;
    this.response = response;
    this.code = response?.error?.status;
    this.status = response?.error?.status;

    // Ensure correct stack trace in error object
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FetchError);
    }
  }
}

export const isFetchError = (error: unknown): error is FetchError => {
  return error instanceof FetchError;
};

const getToken = () =>
  JSON.parse(
    localStorage.getItem(STORAGE_KEYS.TOKEN) ?? sessionStorage.getItem(STORAGE_KEYS.TOKEN) ?? '""'
  );

const addPrependingSlash = (url: string) => (url.charAt(0) !== '/' ? `/${url}` : url);

// This regular expression matches a string that starts with either "http://" or "https://" or any other protocol name in lower case letters, followed by "://" and ends with anything else
const hasProtocol = (url: string) => new RegExp('^(?:[a-z+]+:)?//', 'i').test(url);

// Check if the url has a prepending slash, if not add a slash
const normalizeUrl = (url: string) => (hasProtocol(url) ? url : addPrependingSlash(url));

type FetchClient = {
  get: <TData = unknown, R = FetchResponse<TData>>(
    url: string,
    config?: FetchOptions
  ) => Promise<R>;
  put: <TData = unknown, R = FetchResponse<TData>, TSend = unknown>(
    url: string,
    data?: TSend,
    config?: FetchOptions
  ) => Promise<R>;
  post: <TData = unknown, R = FetchResponse<TData>, TSend = unknown>(
    url: string,
    data?: TSend,
    config?: FetchOptions
  ) => Promise<R>;
  del: <TData = unknown, R = FetchResponse<TData>>(
    url: string,
    config?: FetchOptions
  ) => Promise<R>;
};

/**
 * @public
 * @param {FetchConfig} [defaultOptions={}] - Fetch Configs.
 * @returns {FetchClient} A fetch client object with methods for making HTTP requests.
 * @description This is an abstraction around the native fetch exposed by a function. It provides a simple interface to handle API calls
 * to the Strapi backend.
 * @example
 * ```tsx
 * import { getFetchClient } from '@strapi/admin/admin';
 *
 * const myFunct = () => {
 *   const { get } = getFetchClient();
 *   const requestURL = "/some-endpoint";
 *
 *   const { data } = await get(requestURL);
 *
 *   return data;
 * };
 * ```
 */
const getFetchClient = (defaultOptions: FetchConfig = {}): FetchClient => {
  const baseURL = defaultOptions.baseURL;
  const backendURL = window.strapi.backendURL;
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  });

  // Add a response interceptor to return the response
  const responseInterceptor = async <TData = unknown>(
    response: Response
  ): Promise<FetchResponse<TData>> => {
    const result = await response.json();
    if (result.error) {
      throw new FetchError(result.error.message, result);
    }
    return {
      data: result,
    };
  };

  const paramsSerializer = <Param = unknown>(url: string, params?: Param) => {
    if (params) {
      const serializedParams = qs.stringify(params, { encode: false });
      return `${url}?${serializedParams}`;
    }
    return url;
  };

  const addBaseUrl = (url: FetchURL) => {
    if (baseURL) {
      return `${backendURL}${baseURL}${url}`;
    }
    return `${backendURL}${url}`;
  };

  const fetchClient: FetchClient = {
    get: async <TData, R = FetchResponse<TData>>(
      url: string,
      options?: FetchOptions
    ): Promise<R> => {
      const response = await fetch(
        paramsSerializer(addBaseUrl(normalizeUrl(url)), options?.params),
        {
          signal: options?.signal ?? defaultOptions.signal,
          method: 'GET',
          headers,
        }
      );
      return responseInterceptor<TData>(response) as Promise<R>;
    },
    post: async <TData, R = FetchResponse<TData>, TSend = unknown>(
      url: string,
      data?: TSend,
      options?: FetchOptions
    ): Promise<R> => {
      const response = await fetch(
        paramsSerializer(addBaseUrl(normalizeUrl(url)), options?.params),
        {
          signal: options?.signal ?? defaultOptions.signal,
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }
      );
      return responseInterceptor<TData>(response) as Promise<R>;
    },
    put: async <TData, R = FetchResponse<TData>, TSend = unknown>(
      url: string,
      data?: TSend,
      options?: FetchOptions
    ): Promise<R> => {
      const response = await fetch(
        paramsSerializer(addBaseUrl(normalizeUrl(url)), options?.params),
        {
          signal: options?.signal ?? defaultOptions.signal,
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        }
      );
      return responseInterceptor<TData>(response) as Promise<R>;
    },
    del: async <TData, R = FetchResponse<TData>>(
      url: string,
      options?: FetchOptions
    ): Promise<R> => {
      const response = await fetch(
        paramsSerializer(addBaseUrl(normalizeUrl(url)), options?.params),
        {
          signal: options?.signal ?? defaultOptions.signal,
          method: 'DELETE',
          headers,
        }
      );
      return responseInterceptor<TData>(response) as Promise<R>;
    },
  };

  return fetchClient;
};

export { getFetchClient };
