import '@strapi/types';

const getService = (name: string) => {
  return strapi.plugin('content-manager').service(name);
};

export { getService };
