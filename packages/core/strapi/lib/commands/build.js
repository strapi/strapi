'use strict';

const strapi = require('../');
const { buildAdmin } = require('./builders');

/**
 * `$ strapi build`
 */
module.exports = async ({ optimization, forceBuild = true }) => {
  const { appDir, distDir } = await strapi.compile();

  await buildAdmin({
    forceBuild,
    optimization,
    buildDestDir: distDir,
    srcDir: appDir,
  });
};
