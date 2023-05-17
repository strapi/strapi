'use strict';

const tsUtils = require('@strapi/typescript-utils');

const strapi = require('../../../../index');

module.exports = async ({ debug, silent }) => {
  if (debug && silent) {
    console.error('Flags conflict: both silent and debug mode are enabled, exiting...');
    process.exit(1);
  }

  const appContext = await strapi.compile();
  const app = await strapi(appContext).register();

  await tsUtils.generators.generate({
    strapi: app,
    pwd: appContext.appDir,
    logger: { silent, debug },
    artefacts: { contentTypes: true, components: true },
  });

  app.destroy();
};
