import pipe from 'lodash/fp/pipe';
import qs from 'qs';

import type { ApiError } from '../hooks/useAPIErrorHandler';

const STORAGE_KEYS = {
  TOKEN: 'jwtToken',
  USER: 'userInfo',
};

type FetchResponse<TData = any> = {
  data: TData;
  status?: number;
};

type FetchOptions = {
  params?: any;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  validateStatus?: ((status: number) => boolean) | null;
};

type FetchConfig = {
  signal?: AbortSignal;
};

interface ErrorResponse {
  data: {
    data?: any;
    error: ApiError & { status?: number };
  };
}

class FetchError extends Error {
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
    this.code = response?.data?.error?.status;
    this.status = response?.data?.error?.status;

    // Ensure correct stack trace in error object
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FetchError);
    }
  }
}

const isFetchError = (error: unknown): error is FetchError => {
  return error instanceof FetchError;
};

const getToken = () =>
  JSON.parse(
    localStorage.getItem(STORAGE_KEYS.TOKEN) ?? sessionStorage.getItem(STORAGE_KEYS.TOKEN) ?? '""'
  );

type FetchClient = {
  get: <TData = any>(url: string, config?: FetchOptions) => Promise<FetchResponse<TData>>;
  put: <TData = any, TSend = any>(
    url: string,
    data?: TSend,
    config?: FetchOptions
  ) => Promise<FetchResponse<TData>>;
  post: <TData = any, TSend = any>(
    url: string,
    data?: TSend,
    config?: FetchOptions
  ) => Promise<FetchResponse<TData>>;
  del: <TData = any>(url: string, config?: FetchOptions) => Promise<FetchResponse<TData>>;
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
  const backendURL = window.strapi.backendURL;
  const defaultHeader = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };

  const isFormDataRequest = (body: unknown) => body instanceof FormData;
  const addPrependingSlash = (url: string) => (url.charAt(0) !== '/' ? `/${url}` : url);

  // This regular expression matches a string that starts with either "http://" or "https://" or any other protocol name in lower case letters, followed by "://" and ends with anything else
  const hasProtocol = (url: string) => new RegExp('^(?:[a-z+]+:)?//', 'i').test(url);

  // Check if the url has a prepending slash, if not add a slash
  const normalizeUrl = (url: string) => (hasProtocol(url) ? url : addPrependingSlash(url));

  // Add a response interceptor to return the response
  const responseInterceptor = async <TData = any>(
    response: Response,
    validateStatus?: FetchOptions['validateStatus']
  ): Promise<FetchResponse<TData>> => {
    try {
      const result = await response.json();

      /**
       * validateStatus allows us to customize when a response should throw an error
       * In native Fetch API, a response is considered "not ok"
       * when the status code falls in the 200 to 299 (inclusive) range
       */
      if (!response.ok && result.error && !validateStatus?.(response.status)) {
        throw new FetchError(result.error.message, { data: result });
      }

      if (!response.ok && !validateStatus?.(response.status)) {
        throw new FetchError('Unknown Server Error');
      }

      return { data: result };
    } catch (error) {
      if (error instanceof SyntaxError && response.ok) {
        // Making sure that a SyntaxError doesn't throw if it's successful
        return { data: [], status: response.status } as FetchResponse<any>;
      } else {
        throw error;
      }
    }
  };

  const paramsSerializer =
    <Param = unknown>(params?: Param) =>
    (url: string) => {
      if (params) {
        const serializedParams = qs.stringify(params, { encode: false });
        return `${url}?${serializedParams}`;
      }
      return url;
    };

  const addBaseUrl = (url: Parameters<typeof fetch>[0]) => {
    return `${backendURL}${url}`;
  };

  /**
   * We use the factory method because the options
   * are unique to the individual request
   */
  const makeCreateRequestUrl = (options?: FetchOptions) =>
    pipe(normalizeUrl, addBaseUrl, paramsSerializer(options?.params));

  const fetchClient: FetchClient = {
    get: async <TData>(url: string, options?: FetchOptions): Promise<FetchResponse<TData>> => {
      const headers = new Headers({
        ...defaultHeader,
        ...options?.headers,
      });
      /**
       * this applies all our transformations to the URL
       * - normalizing (making sure it has the correct slash)
       * - appending our BaseURL which comes from the window.strapi object
       * - serializing our params with QS
       */
      const createRequestUrl = makeCreateRequestUrl(options);
      const response = await fetch(createRequestUrl(url), {
        signal: options?.signal ?? defaultOptions.signal,
        method: 'GET',
        headers,
      });

      return responseInterceptor<TData>(response, options?.validateStatus);
    },
    post: async <TData, TSend = any>(
      url: string,
      data?: TSend,
      options?: FetchOptions
    ): Promise<FetchResponse<TData>> => {
      const headers = new Headers({
        ...defaultHeader,
        ...options?.headers,
      });

      const createRequestUrl = makeCreateRequestUrl(options);

      /**
       * we have to remove the Content-Type value if it was a formData request
       * the browser will automatically set the header value
       */
      if (isFormDataRequest(data)) {
        headers.delete('Content-Type');
      }

      const response = await fetch(createRequestUrl(url), {
        signal: options?.signal ?? defaultOptions.signal,
        method: 'POST',
        headers,
        body: isFormDataRequest(data) ? (data as FormData) : JSON.stringify(data),
      });
      return responseInterceptor<TData>(response, options?.validateStatus);
    },
    put: async <TData, TSend = any>(
      url: string,
      data?: TSend,
      options?: FetchOptions
    ): Promise<FetchResponse<TData>> => {
      const headers = new Headers({
        ...defaultHeader,
        ...options?.headers,
      });

      const createRequestUrl = makeCreateRequestUrl(options);

      /**
       * we have to remove the Content-Type value if it was a formData request
       * the browser will automatically set the header value
       */
      if (isFormDataRequest(data)) {
        headers.delete('Content-Type');
      }

      const response = await fetch(createRequestUrl(url), {
        signal: options?.signal ?? defaultOptions.signal,
        method: 'PUT',
        headers,
        body: isFormDataRequest(data) ? (data as FormData) : JSON.stringify(data),
      });

      return responseInterceptor<TData>(response, options?.validateStatus);
    },
    del: async <TData>(url: string, options?: FetchOptions): Promise<FetchResponse<TData>> => {
      const headers = new Headers({
        ...defaultHeader,
        ...options?.headers,
      });

      const createRequestUrl = makeCreateRequestUrl(options);
      const response = await fetch(createRequestUrl(url), {
        signal: options?.signal ?? defaultOptions.signal,
        method: 'DELETE',
        headers,
      });
      return responseInterceptor<TData>(response, options?.validateStatus);
    },
  };

  return fetchClient;
};

export { getFetchClient, isFetchError, FetchError };
export type { FetchOptions, FetchResponse, FetchConfig, FetchClient, ErrorResponse };
