import type { AxiosInstance } from 'axios';

const pickedMethods = [
  'request',
  'get',
  'head',
  'delete',
  'options',
  'post',
  'put',
  'patch',
  'getUri',
] as const;

type WrappedAxiosInstance = {
  [K in (typeof pickedMethods)[number]]: AxiosInstance[K];
};

/**
 * @deprecated Use the useFetchClient() hook instead, which is exported from the helper-plugin: { useFetchClient } from "@strapi/helper-plugin"
 */
function wrapAxiosInstance(instance: AxiosInstance): WrappedAxiosInstance {
  const isDevelopmentEnv = process.env.NODE_ENV === 'development';

  const warn = () => {
    // Only log deprecation warnings in development
    if (!isDevelopmentEnv) return;

    console.warn(
      'Deprecation warning: Usage of "axiosInstance" utility is deprecated and will be removed in the next major release. Instead, use the useFetchClient() hook, which is exported from the helper-plugin: { useFetchClient } from "@strapi/helper-plugin"'
    );
  };

  const wrapper: WrappedAxiosInstance = {
    request: (...args) => {
      warn();
      return instance.request(...args);
    },
    get: (...args) => {
      warn();
      return instance.get(...args);
    },
    head: (...args) => {
      warn();
      return instance.head(...args);
    },
    delete: (...args) => {
      warn();
      return instance.delete(...args);
    },
    options: (...args) => {
      warn();
      return instance.options(...args);
    },
    post: (...args) => {
      warn();
      return instance.post(...args);
    },
    put: (...args) => {
      warn();
      return instance.put(...args);
    },
    patch: (...args) => {
      warn();
      return instance.patch(...args);
    },
    getUri: (...args) => {
      warn();
      return instance.getUri(...args);
    },
  };

  return wrapper;
}

export { wrapAxiosInstance };
