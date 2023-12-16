export const getService = (
  name: 'release' | 'release-validation',
  { strapi } = { strapi: global.strapi }
) => {
  return strapi.plugin('content-releases').service(name);
};
