import { AxiosRequestConfig, AxiosResponse } from 'axios';

import { instance } from './fetchClient';

const addPrependingSlash = (url: string) => (url.charAt(0) !== '/' ? `/${url}` : url);

// This regular expression matches a string that starts with either "http://" or "https://" or any other protocol name in lower case letters, followed by "://" and ends with anything else
const hasProtocol = (url: string) => new RegExp('^(?:[a-z+]+:)?//', 'i').test(url);

// Check if the url has a prepending slash, if not add a slash
const normalizeUrl = (url: string) => (hasProtocol(url) ? url : addPrependingSlash(url));

type FetchClient = {
  get: (url: string, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
  put: (url: string, data: any, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
  post: (url: string, data: any, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
  del: (url: string, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
};

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

export { getFetchClient };
