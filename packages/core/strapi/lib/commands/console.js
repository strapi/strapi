'use strict';

const REPL = require('repl');
const path = require('path');
const tsUtils = require('@strapi/typescript-utils');

const strapi = require('../index');

/**
 * `$ strapi console`
 */
module.exports = async () => {
  // Now load up the Strapi framework for real.
  const appDir = process.cwd();

  const isTSProject = await tsUtils.isUsingTypeScript(appDir);
  const distDir = isTSProject ? path.join(appDir, 'dist') : appDir;

  const app = await strapi({ appDir, distDir }).load();

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
