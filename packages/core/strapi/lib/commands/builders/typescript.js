'use strict';

const path = require('path');
const fs = require('fs-extra');
const tsUtils = require('@strapi/typescript-utils');

const cleanupDistDirectory = async distDir => {
  if (!(await fs.pathExists(distDir))) {
    return;
  }

  const dirContent = await fs.readdir(distDir);
  const validFilenames = dirContent
    // Ignore the admin build folder
    .filter(filename => filename !== 'build');

  for (const filename of validFilenames) {
    await fs.remove(path.resolve(distDir, filename));
  }
};

module.exports = async ({ srcDir, distDir, watch = false }) => {
  const isTSProject = await tsUtils.isUsingTypeScript(srcDir);

  if (!isTSProject) {
    throw new Error(`tsconfig file not found in ${srcDir}`);
  }

  await cleanupDistDirectory(distDir);

  return tsUtils.compile(srcDir, { watch });
};
