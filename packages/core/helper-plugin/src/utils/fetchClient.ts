import axios, { AxiosInstance } from 'axios';
import qs from 'qs';

import { auth } from './auth';

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
      config.headers.Authorization = `Bearer ${auth.getToken()}`;

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add a response interceptor to return the response or handle the error
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        auth.clearAppStorage();
        window.location.reload();
      }

      throw error;
    }
  );

  return instance;
};

const instance = fetchClient();

export { instance };
