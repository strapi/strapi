import axios from 'axios';
import { auth } from '@strapi/helper-plugin';

export const reqInterceptor = async (config) => {
  config.headers = {
    Authorization: `Bearer ${auth.getToken()}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
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

export const fetchClient = ({ baseURL }) => {
  const instance = axios.create({
    baseURL,
  });
  addInterceptors(instance);

  return instance;
};

export default fetchClient({ baseURL: process.env.STRAPI_ADMIN_BACKEND_URL });
