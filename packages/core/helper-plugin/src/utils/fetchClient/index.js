import axios from 'axios';
import auth from '../auth';

export const reqInterceptor = async (config) => {
  config.headers = {
    Authorization: `Bearer ${auth.getToken()}`,
  };

  return config;
};

export const reqErrorInterceptor = (error) => {
  return Promise.reject(error);
};

export const resErrorInterceptor = (error) => {
  // whatever you want to do with the error
  if (error?.response?.status === 401) {
    auth.clearAppStorage();
    window.location.reload();
  }

  throw error;
};

export const fetchClient = () => {
  const instance = axios.create({
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use(reqInterceptor, reqErrorInterceptor);

  return instance;
};

export default fetchClient();
