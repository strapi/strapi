'use strict';

const tsUtils = require('@strapi/typescript-utils');

const strapi = require('../../../../index');

module.exports = async ({ outDir, file, verbose, silent }) => {
  if (verbose && silent) {
    console.error('You cannot enable verbose and silent flags at the same time, exiting...');
    process.exit(1);
  }

  const appContext = await strapi.compile();
  const app = await strapi(appContext).register();

  await tsUtils.generators.generateSchemasDefinitions({
    strapi: app,
    outDir: outDir || appContext.appDir,
    file,
    dirs: appContext,
    verbose,
    silent,
  });

  app.destroy();
};
