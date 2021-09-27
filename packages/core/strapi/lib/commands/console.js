'use strict';

const REPL = require('repl');
const strapi = require('../index');

/**
 * `$ strapi console`
 */
module.exports = () => {
  // Now load up the Strapi framework for real.
  const app = strapi();

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
