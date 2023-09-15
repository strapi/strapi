import { AxiosRequestConfig, AxiosResponse } from 'axios';

import { instance } from './fetchClient';

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
