'use strict';

const REPL = require('repl');

const strapi = require('../index');

/**
 * `$ strapi console`
 */
module.exports = async () => {
  const appContext = await strapi.compile();
  const app = await strapi(appContext).load();

  app.start().then(() => {
    const repl = REPL.start(app.config.info.name + ' > ' || 'strapi > '); // eslint-disable-line prefer-template

    repl.on('exit', function(err) {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }

      app.server.destroy();
      process.exit(0);
    });
  });
};
