module.exports = async (ctx, next) => {
  const config = strapi.plugins['users-permissions'].config;

  await next();
};
