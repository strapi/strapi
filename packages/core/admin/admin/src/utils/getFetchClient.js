import axios from 'axios';

import instance from './fetchClient';

export const cancelToken = () => {
  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();

  return source;
};

export const getFetchClient = (options = {}) => {
  return {
    get: (url, config) => instance.get(url, { ...options, ...config }),
    put: (url, data, config) => instance.put(url, data, { ...options, ...config }),
    post: (url, data, config) => instance.post(url, data, { ...options, ...config }),
    delete: (url, config) => instance.get(url, { ...options, ...config }),
  };
};
