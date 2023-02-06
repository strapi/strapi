function wrapAxiosInstance(instance) {
  if (process.env.NODE_ENV !== 'development') return instance;
  const wrapper = {};
  ['request', 'get', 'head', 'delete', 'options', 'post', 'put', 'patch', 'getUri'].forEach(
    (methodName) => {
      wrapper[methodName] = (...args) => {
        console.log(
          'Deprecation warning: Usage of "axiosInstance" utility is deprecated and will be removed in the next major release. Instead, use the useFetchClient() hook, which is exported from the helper-plugin: { useFetchClient } from "@strapi/helper-plugin"'
        );

        return instance[methodName](...args);
      };
    }
  );

  return wrapper;
}

export default wrapAxiosInstance;
