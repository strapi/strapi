import axios from 'axios';
import { auth } from '@strapi/helper-plugin';
// TODO: remember to pass also the pluginId when you use the new get, post, put, delete methods from fetchClient
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

const wrapper = {};

['request', 'get', 'head', 'delete', 'options', 'post', 'put', 'patch', 'getUri'].forEach(
  (methodName) => {
    wrapper[methodName] = (...args) => {
      console.log(
        'Deprecation warning: Usage of "axiosInstance" utility is deprecated and will be removed in the next major release. Instead, use the useFetchClient() hook, which is exported from the helper-plugin: { useFetchClient } from "@strapi/helper-plugin"'
      );

      return instance[methodName](...args);
    };

    return wrapper;
  }
);

export default wrapper;
