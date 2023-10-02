import {} from '@strapi/types';

const getService = (name) => {
  return strapi.service(`admin::${name}`);
};

export { getService };
