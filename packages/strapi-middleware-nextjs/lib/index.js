var next = require('next');
var Router = require('koa-router');
const _ = require('lodash');

module.exports = strapi => {
  return {
    initialize: function (cb) {
      const opts = _.clone(strapi.config.middleware.settings.nextjs);
      const nextApp = next(opts.nextOptions);
      // start preparing next.js
      const prepareNext = nextApp
        .prepare()
        .then(() => nextApp.getRequestHandler());

      const router = new Router();
      router.get('*', async (ctx, next) => {
        // The ctx url could be modified before this middleware is run, so cache the original URL
        let beforeUrl = ctx.req.url;
        // Run all of the other middlewares
        await next();
        // If we still have a status of 404, let next.js handle the request
        if (ctx.response.status === 404) {
          ctx.url = beforeUrl;
          // Make sure we are done preparing next and get the handler
          const handle = await prepareNext();
          // Handle the request
          await handle(ctx.req, ctx.res);
          // Request sent, now clobber everything else so that the rest of 
          // the middlewares (looking at you koa-compress) don't think
          // we are trying to send something
          delete ctx.body;
          ctx.respond = false;
          ctx.headersSent = true;
        }
      });

      // Setup strapi to use the router
      strapi.app.use(router.routes());
      // continue initializing Strapi
      cb();
    }
  };
};
