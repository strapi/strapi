import axios from 'axios';
import { auth, wrapAxiosInstance } from '@strapi/helper-plugin';

const instance = axios.create({
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

const wrapper = process.env.NODE_ENV === 'development' ? wrapAxiosInstance(instance) : instance;

export default wrapper;
