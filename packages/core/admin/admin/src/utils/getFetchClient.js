import instance from './fetchClient';

export const getFetchClient = (defaultOptions = {}) => {
  return {
    get: (url, config) => instance.get(url, { ...defaultOptions, ...config }),
    put: (url, data, config) => instance.put(url, data, { ...defaultOptions, ...config }),
    post: (url, data, config) => instance.post(url, data, { ...defaultOptions, ...config }),
    delete: (url, config) => instance.delete(url, { ...defaultOptions, ...config }),
  };
};
