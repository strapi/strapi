import axios from 'axios';
import { auth } from '@strapi/helper-plugin';

// eslint-disable-next-line import/no-mutable-exports
export let instance;

export const getFetchClient = () => {
  if (!instance) {
    instance = axios.create({
      baseURL: process.env.STRAPI_ADMIN_BACKEND_URL,
    });

    instance.interceptors.request.use(
      async (config) => {
        config.headers = {
          Authorization: `Bearer ${auth.getToken()}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        };

        return config;
      },
      (error) => {
        Promise.reject(error);
      }
    );

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        // whatever you want to do with the error
        if (error?.response?.status === 401) {
          auth.clearAppStorage();
          window.location.reload();
        }

        throw error;
      }
    );
  }

  return {
    get: (url, config) => instance.get(url, config),
    put: (url, data, config) => instance.put(url, data, config),
    post: (url, data, config) => instance.post(url, data, config),
    delete: (url, config) => instance.get(url, config),
  };
};
