'use strict';
const tsUtils = require('@strapi/typescript-utils');
const strapi = require('../index');

/**
 * `$ strapi start`
 */
module.exports = async specifiedDir => {
  const appDir = process.cwd();
  const isTSProject = await tsUtils.isUsingTypeScript(appDir);
  const outDir = await tsUtils.resolveOutDir(appDir);
  if (isTSProject)
    await tsUtils.compile(appDir, {
      watch: false,
      configOptions: { options: { incremental: true } },
    });
  const distDir = isTSProject && !specifiedDir ? outDir : specifiedDir;

  strapi({ distDir }).start();
};
