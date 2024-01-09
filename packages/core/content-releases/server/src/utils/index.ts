export const getService = (
  name: 'release' | 'release-validation' | 'release-action',
  { strapi } = { strapi: global.strapi }
) => {
  return strapi.plugin('content-releases').service(name);
};
