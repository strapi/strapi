import { Strapi } from '@strapi/types';

export const getService = (
  name: string,
  { strapi }: { strapi: Strapi } = { strapi: global.strapi }
) => {
  return strapi.service(`admin::${name}`);
};

export default {
  getService,
};
