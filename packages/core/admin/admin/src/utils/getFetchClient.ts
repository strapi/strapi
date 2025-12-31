import pipe from 'lodash/fp/pipe';
// eslint-disable-next-line import/default
import qs from 'qs';

import { getCookieValue, setCookie } from './cookies';

import type { errors } from '@strapi/utils';

export type ApiError =
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

const STORAGE_KEYS = {
  TOKEN: 'jwtToken',
  USER: 'userInfo',
};

/**
 * Module-level promise to ensure only one token refresh happens at a time
 */
let refreshPromise: Promise<string | null> | null = null;

/**
 * Callback to notify the app when the token is updated (e.g., to update Redux state)
 */
let onTokenUpdate: ((token: string) => void) | null = null;

/**
 * Set the callback that will be called when the token is refreshed.
 * This allows the React layer to update Redux state when a token refresh occurs.
 *
 * @param callback - Function to call with the new token, or null to clear
 * @example
 * // In a React component
 * useEffect(() => {
 *   setOnTokenUpdate((token) => dispatch(setToken(token)));
 *   return () => setOnTokenUpdate(null);
 * }, [dispatch]);
 */
const setOnTokenUpdate = (callback: ((token: string) => void) | null): void => {
  onTokenUpdate = callback;
};

/**
 * Check if the URL is an auth path that should not trigger token refresh.
 * Note: No ^ anchor since the URL may include the baseURL prefix (e.g., "http://localhost:1337/admin/login").
 * This differs from baseQuery.ts which uses ^/admin since it receives normalized paths.
 */
const isAuthPath = (url: string) => /\/admin\/(login|logout|access-token)\b/.test(url);

/**
 * Store the new token in the appropriate storage (localStorage or cookie)
 * and notify the app to update its state.
 *
 * Uses localStorage if the user selected "remember me" during login,
 * otherwise uses cookies for session-based storage.
 *
 * @param token - The JWT token to store
 * @internal Exported for testing purposes
 */
const storeToken = (token: string): void => {
  // Check if the original token was stored in localStorage (persist mode)
  const wasPersistedToLocalStorage = Boolean(localStorage.getItem(STORAGE_KEYS.TOKEN));

  if (wasPersistedToLocalStorage) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(token));
  } else {
    setCookie(STORAGE_KEYS.TOKEN, token);
  }

  // Notify the app to update its state (e.g., Redux)
  if (onTokenUpdate) {
    onTokenUpdate(token);
  }
};

/**
 * Refresh the access token by calling the /admin/access-token endpoint.
 * This uses a low-level fetch to avoid recursion through the interceptor.
 * Returns the new token on success, or null on failure.
 */
const refreshAccessToken = async (): Promise<string | null> => {
  const backendURL = window.strapi.backendURL;

  try {
    const response = await fetch(`${backendURL}/admin/access-token`, {
      method: 'POST',
      credentials: 'include', // Include cookies for the refresh token
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[Auth] Token refresh failed with status:', response.status);
      return null;
    }

    const result = await response.json();
    const token = result?.data?.token as string | undefined;

    if (!token) {
      console.warn('[Auth] Token refresh response missing token');
      return null;
    }

    storeToken(token);
    return token;
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    return null;
  }
};

/**
 * Attempt to refresh the token if not already refreshing.
 * Uses a module-level promise to prevent concurrent refresh requests.
 *
 * @returns The new authentication token
 * @throws {Error} If the token refresh fails (e.g., refresh token expired)
 * @internal Exported for testing purposes
 */
const attemptTokenRefresh = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  const newToken = await refreshPromise;
  if (!newToken) {
    const error = new Error('Session expired. Please log in again.');
    error.name = 'TokenRefreshError';
    throw error;
  }

  return newToken;
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

const getToken = (): string | null => {
  const fromLocalStorage = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (fromLocalStorage) {
    return JSON.parse(fromLocalStorage);
  }

  const fromCookie = getCookieValue(STORAGE_KEYS.TOKEN);
  return fromCookie ?? null;
};

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

  /**
   * Create default headers with the current token.
   * This is a function so we can get a fresh token after refresh.
   */
  const getDefaultHeaders = () => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  });

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
        const fetchError = new FetchError(result.error.message, { data: result });
        fetchError.status = response.status;
        throw fetchError;
      }

      if (!response.ok && !validateStatus?.(response.status)) {
        const fetchError = new FetchError('Unknown Server Error');
        fetchError.status = response.status;
        throw fetchError;
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

  /**
   * Execute a fetch request with automatic token refresh on 401 errors.
   * @param url - The request URL (used to check if it's an auth path)
   * @param executeRequest - Function that performs the fetch (called again on retry with fresh headers)
   */
  const withTokenRefresh = async <TData>(
    url: string,
    executeRequest: () => Promise<FetchResponse<TData>>
  ): Promise<FetchResponse<TData>> => {
    try {
      return await executeRequest();
    } catch (error) {
      // Only attempt refresh for 401 errors on non-auth paths
      if (isFetchError(error) && error.status === 401 && !isAuthPath(url)) {
        try {
          await attemptTokenRefresh();
          // Retry - executeRequest will call getDefaultHeaders() again, picking up the new token
          return await executeRequest();
        } catch {
          // If refresh fails, throw the original error
          throw error;
        }
      }
      throw error;
    }
  };

  const paramsSerializer =
    <Param = unknown>(params?: Param) =>
    (url: string) => {
      if (params) {
        if (typeof params === 'string') {
          return `${url}?${params}`;
        }

        /**
         * TODO V6: Encoding should be enabled in this step
         * So the rest of the app doesn't have to worry about it,
         * It's considered a breaking change because it impacts any API request, including the user's custom code
         */
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
      const createRequestUrl = makeCreateRequestUrl(options);

      const executeRequest = async () => {
        const headers = new Headers({
          ...getDefaultHeaders(),
          ...options?.headers,
        });

        const response = await fetch(createRequestUrl(url), {
          signal: options?.signal ?? defaultOptions.signal,
          method: 'GET',
          headers,
        });

        return responseInterceptor<TData>(response, options?.validateStatus);
      };

      return withTokenRefresh(url, executeRequest);
    },
    post: async <TData, TSend = any>(
      url: string,
      data?: TSend,
      options?: FetchOptions
    ): Promise<FetchResponse<TData>> => {
      const createRequestUrl = makeCreateRequestUrl(options);

      const executeRequest = async () => {
        const headers = new Headers({
          ...getDefaultHeaders(),
          ...options?.headers,
        });

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
      };

      return withTokenRefresh(url, executeRequest);
    },
    put: async <TData, TSend = any>(
      url: string,
      data?: TSend,
      options?: FetchOptions
    ): Promise<FetchResponse<TData>> => {
      const createRequestUrl = makeCreateRequestUrl(options);

      const executeRequest = async () => {
        const headers = new Headers({
          ...getDefaultHeaders(),
          ...options?.headers,
        });

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
      };

      return withTokenRefresh(url, executeRequest);
    },
    del: async <TData>(url: string, options?: FetchOptions): Promise<FetchResponse<TData>> => {
      const createRequestUrl = makeCreateRequestUrl(options);

      const executeRequest = async () => {
        const headers = new Headers({
          ...getDefaultHeaders(),
          ...options?.headers,
        });

        const response = await fetch(createRequestUrl(url), {
          signal: options?.signal ?? defaultOptions.signal,
          method: 'DELETE',
          headers,
        });
        return responseInterceptor<TData>(response, options?.validateStatus);
      };

      return withTokenRefresh(url, executeRequest);
    },
  };

  return fetchClient;
};

export {
  getFetchClient,
  isFetchError,
  FetchError,
  attemptTokenRefresh,
  storeToken,
  setOnTokenUpdate,
};
export type { FetchOptions, FetchResponse, FetchConfig, FetchClient, ErrorResponse };
