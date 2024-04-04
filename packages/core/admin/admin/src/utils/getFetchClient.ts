import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';
import qs from 'qs';

const STORAGE_KEYS = {
  TOKEN: 'jwtToken',
  USER: 'userInfo',
};

const fetchClient = (): AxiosInstance => {
  const instance = axios.create({
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    paramsSerializer: (params) => {
      return qs.stringify(params, { encode: false });
    },
  });

  // Add a request interceptor to add authorization token to headers, rejects errors
  instance.interceptors.request.use(
    async (config) => {
      config.headers.Authorization = `Bearer ${getToken()}`;

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add a response interceptor to return the response or handle the error
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        clearItem(STORAGE_KEYS.TOKEN);
        clearItem(STORAGE_KEYS.USER);

        window.location.reload();
      }

      throw error;
    }
  );

  return instance;
};

const clearItem = (key: string) => {
  if (window.localStorage.getItem(key)) {
    return window.localStorage.removeItem(key);
  }

  if (window.sessionStorage.getItem(key)) {
    return window.sessionStorage.removeItem(key);
  }
};

const getToken = () =>
  JSON.parse(
    localStorage.getItem(STORAGE_KEYS.TOKEN) ?? sessionStorage.getItem(STORAGE_KEYS.TOKEN) ?? '""'
  );

const instance = fetchClient();

const addPrependingSlash = (url: string) => (url.charAt(0) !== '/' ? `/${url}` : url);

// This regular expression matches a string that starts with either "http://" or "https://" or any other protocol name in lower case letters, followed by "://" and ends with anything else
const hasProtocol = (url: string) => new RegExp('^(?:[a-z+]+:)?//', 'i').test(url);

// Check if the url has a prepending slash, if not add a slash
const normalizeUrl = (url: string) => (hasProtocol(url) ? url : addPrependingSlash(url));

type FetchClient = {
  get: <TData = any, R = AxiosResponse<TData>, TSend = any>(
    url: string,
    config?: AxiosRequestConfig<TSend>
  ) => Promise<R>;
  put: <TData = any, R = AxiosResponse<TData>, TSend = any>(
    url: string,
    data?: TSend,
    config?: AxiosRequestConfig<TSend>
  ) => Promise<R>;
  post: <TData = any, R = AxiosResponse<TData>, TSend = any>(
    url: string,
    data?: TSend,
    config?: AxiosRequestConfig<TSend>
  ) => Promise<R>;
  del: <TData = any, R = AxiosResponse<TData>, TSend = any>(
    url: string,
    config?: AxiosRequestConfig<TSend>
  ) => Promise<R>;
};

/**
 * @public
 * @param {AxiosRequestConfig} [defaultOptions={}] - Default options for Axios requests.
 * @returns {FetchClient} A fetch client object with methods for making HTTP requests.
 * @description This is an abstraction around the axios instance exposed by a function. It provides a simple interface to handle API calls
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
const getFetchClient = (defaultOptions: AxiosRequestConfig = {}): FetchClient => {
  instance.defaults.baseURL = window.strapi.backendURL;
  return {
    get: (url, config) =>
      instance.get(normalizeUrl(url), {
        ...defaultOptions,
        ...config,
      }),
    put: (url, data, config) =>
      instance.put(normalizeUrl(url), data, { ...defaultOptions, ...config }),
    post: (url, data, config) =>
      instance.post(normalizeUrl(url), data, { ...defaultOptions, ...config }),
    del: (url, config) => instance.delete(normalizeUrl(url), { ...defaultOptions, ...config }),
  };
};

export { instance, getFetchClient };
