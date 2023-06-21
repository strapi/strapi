'use strict';

const tsUtils = require('@strapi/typescript-utils');

const strapi = require('../../../../index');

module.exports = async ({ debug, silent, verbose, outDir }) => {
  if ((debug || verbose) && silent) {
    console.error('Flags conflict: both silent and debug mode are enabled, exiting...');
    process.exit(1);
  }

  const appContext = await strapi.compile();
  const app = await strapi(appContext).register();

  await tsUtils.generators.generate({
    strapi: app,
    pwd: appContext.appDir,
    rootDir: outDir ?? undefined,
    logger: {
      silent,
      // TODO V5: verbose is deprecated and should be removed
      debug: debug || verbose,
    },
    artifacts: { contentTypes: true, components: true },
  });

  app.destroy();
};
