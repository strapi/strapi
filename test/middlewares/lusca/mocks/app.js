'use strict';

const strapi = require('../../../..');

const Koa = strapi.server;

module.exports = function (config, disableSession) {
  const app = new Koa();
  const router = strapi.middlewares.router();

  app.keys = ['key1', 'key2'];

  if (!disableSession) {
    app.use(strapi.middlewares.session({
      secret: 'abc'
    }, app));
  }

  app.use(strapi.middlewares.bodyparser());
  app.use(strapi.middlewares.lusca(config));

  router.get('/', function * () {
    this.body = 'hello';
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
};
