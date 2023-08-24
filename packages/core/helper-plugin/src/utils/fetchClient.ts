import axios from 'axios';
import qs from 'qs';

import { auth } from './auth';

/**
 * TODO: review this file, we export a lot
 * of internals and it's not entirely clear why...
 */

export const reqInterceptor = async (config) => {
  config.headers = {
    Authorization: `Bearer ${auth.getToken()}`,
  };

  return config;
};

export const reqErrorInterceptor = (error) => {
  return Promise.reject(error);
};

export const resInterceptor = (response) => response;

export const resErrorInterceptor = (error) => {
  // whatever you want to do with the error
  if (error?.response?.status === 401) {
    auth.clearAppStorage();
    window.location.reload();
  }

  throw error;
};

export const addInterceptors = (instance) => {
  instance.interceptors.request.use(reqInterceptor, reqErrorInterceptor);

  instance.interceptors.response.use(resInterceptor, resErrorInterceptor);
};

export const fetchClient = () => {
  const instance = axios.create({
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    paramsSerializer: (params) => {
      return qs.stringify(params, { encode: false });
    },
  });
  addInterceptors(instance);

  return instance;
};

const instance = fetchClient();

export { instance };
