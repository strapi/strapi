import axios from 'axios';
import { auth, wrapAxiosInstance } from '@strapi/helper-plugin';
// TODO: remember to pass also the pluginId when you use the new get, post, put, delete methods from getFetchClient
import pluginId from '../pluginId';

const instance = axios.create({
  baseURL: `${process.env.STRAPI_ADMIN_BACKEND_URL}/${pluginId}`,
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
    if (error.response?.status === 401) {
      auth.clearAppStorage();
      window.location.reload();
    }

    throw error;
  }
);

const wrapper = process.env.NODE_ENV === 'development' ? wrapAxiosInstance(instance) : instance;

export default wrapper;
