import fetchClient from '../fetchClient';

const getFetchClient = (defaultOptions = {}) => {
  const instance = fetchClient({ baseURL: window.strapi.backendURL });
  return {
    get: (url, config) => instance.get(url, { ...defaultOptions, ...config }),
    put: (url, data, config) => instance.put(url, data, { ...defaultOptions, ...config }),
    post: (url, data, config) => instance.post(url, data, { ...defaultOptions, ...config }),
    del: (url, config) => instance.delete(url, { ...defaultOptions, ...config }),
  };
};

export default getFetchClient;
