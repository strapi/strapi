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

function wrapAxiosInstance(instance: AxiosInstance): WrappedAxiosInstance {
  if (process.env.NODE_ENV !== 'development') return instance;

  const methodWrapper = <M extends keyof AxiosInstance>(
    method: AxiosInstance[M],
    args: Parameters<AxiosInstance[M]>
  ): ReturnType<AxiosInstance[M]> => {
    console.warn(
      'Deprecation warning: Usage of "axiosInstance" utility is deprecated and will be removed in the next major release. Instead, use the useFetchClient() hook, which is exported from the helper-plugin: { useFetchClient } from "@strapi/helper-plugin"'
    );

    return method(...args);
  };

  const wrapper: WrappedAxiosInstance = {
    request: (...args: Parameters<AxiosInstance['request']>) =>
      methodWrapper(instance.request, args),
    get: (...args: Parameters<AxiosInstance['get']>) => methodWrapper(instance.get, args),
    head: (...args: Parameters<AxiosInstance['head']>) => methodWrapper(instance.head, args),
    delete: (...args: Parameters<AxiosInstance['delete']>) => methodWrapper(instance.delete, args),
    options: (...args: Parameters<AxiosInstance['options']>) =>
      methodWrapper(instance.options, args),
    post: (...args: Parameters<AxiosInstance['post']>) => methodWrapper(instance.post, args),
    put: (...args: Parameters<AxiosInstance['put']>) => methodWrapper(instance.put, args),
    patch: (...args: Parameters<AxiosInstance['patch']>) => methodWrapper(instance.patch, args),
    getUri: (...args: Parameters<AxiosInstance['getUri']>) => methodWrapper(instance.getUri, args),
  };

  return wrapper;
}

export { wrapAxiosInstance };
