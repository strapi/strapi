import { instance } from './fetchClient';

const addPrependingSlash = (url) =>
  typeof url === 'string' && url.charAt(0) !== '/' ? `/${url}` : url;

// This regular expression matches a string that starts with either "http://" or "https://" or any other protocol name in lower case letters, followed by "://" and ends with anything else
const hasProtocol = (url) => new RegExp('^(?:[a-z+]+:)?//', 'i').test(url);

// Check if the url has a prepending slash, if not add a slash
const normalizeUrl = (url) => (hasProtocol(url) ? url : addPrependingSlash(url));

const getFetchClient = (defaultOptions = {}) => {
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
