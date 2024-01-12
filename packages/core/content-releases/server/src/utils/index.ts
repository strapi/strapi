export const getService = (
  name: 'release' | 'release-validation' | 'release-action' | 'event-manager',
  { strapi } = { strapi: global.strapi }
) => {
  return strapi.plugin('content-releases').service(name);
};
