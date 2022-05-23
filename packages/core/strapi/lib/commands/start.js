'use strict';
const fs = require('fs');
const tsUtils = require('@strapi/typescript-utils');
const strapi = require('../index');

/**
 * `$ strapi start`
 */
module.exports = async specifiedDir => {
  const appDir = process.cwd();
  const isTSProject = await tsUtils.isUsingTypeScript(appDir);
  const outDir = await tsUtils.resolveOutDir(appDir);
  const buildDirExists = fs.existsSync(outDir);
  if (isTSProject && !buildDirExists) throw new Error(`${outDir} directory not found. Please run the build command before starting your application`);
  const distDir = isTSProject && !specifiedDir ? outDir : specifiedDir;

  strapi({ distDir }).start();
};
