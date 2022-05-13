'use strict';

const REPL = require('repl');
const tsUtils = require('@strapi/typescript-utils');

const strapi = require('../index');

/**
 * `$ strapi console`
 */
module.exports = async () => {
  // Now load up the Strapi framework for real.
  const appDir = process.cwd();
  const isTSProject = await tsUtils.isUsingTypeScript(appDir);
  const compiledDirectoryPath = isTSProject ? tsUtils.resolveConfigOptions(`${appDir}/tsconfig.json`).options?.outDir : undefined

  if (isTSProject) 
    await tsUtils.compile(appDir, {
      watch: false,
      configOptions: { options: { incremental: true } },
    });

  const distDir = isTSProject ? compiledDirectoryPath : appDir;

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
