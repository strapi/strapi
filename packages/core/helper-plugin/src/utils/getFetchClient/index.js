import instance from '../fetchClient';
import isAbsoluteUrl from '../isAbsoluteUrl';
import addPrependingSlash from '../addPrependingSlash';

export const checkUrl = (url) => {
  const isAbsolute = isAbsoluteUrl(url);
  let newUrl = url;
  if (!isAbsolute) {
    newUrl = addPrependingSlash(url);
  }
  return newUrl;
}

const getFetchClient = (defaultOptions = {}) => {
  instance.defaults.baseURL = window.strapi.backendURL;
  return {
    get: (url, config) => instance.get(checkUrl(url), { ...defaultOptions, ...config }),
    put: (url, data, config) => instance.put(checkUrl(url), data, { ...defaultOptions, ...config }),
    post: (url, data, config) => instance.post(checkUrl(url), data, { ...defaultOptions, ...config }),
    del: (url, config) => instance.delete(checkUrl(url), { ...defaultOptions, ...config }),
  };
};

export default getFetchClient;
