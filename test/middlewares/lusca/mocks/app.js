'use strict';

const strapi = require('../../../..');

module.exports = function (config, disableSession) {
  const app = strapi.server();
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
