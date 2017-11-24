module.exports = strapi => {
  return {
    initialize: function(cb) {
      strapi.app.use(async (ctx, next) => {
        await next();
      });

      cb();
    }
  };
};
