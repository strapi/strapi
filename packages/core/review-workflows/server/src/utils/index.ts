import type { Core } from '@strapi/types';

export const getAdminService = (
  name: string,
  { strapi }: { strapi: Core.Strapi } = { strapi: global.strapi }
) => {
  return strapi.service(`admin::${name}`);
};

export const getService = (name: string, { strapi } = { strapi: global.strapi }) => {
  return strapi.plugin('review-workflows').service(name);
};

export default {
  getAdminService,
  getService,
};
