module.exports = (options) => {
  return (ctx, next) => {
    ctx.set('X-Strapi-Test', 'Address Middleware');
    return next();
  };
};
