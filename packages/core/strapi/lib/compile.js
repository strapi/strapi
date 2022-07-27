'use strict';

const tsUtils = require('@strapi/typescript-utils');

module.exports = async dir => {
  const appDir = dir || process.cwd();
  const isTSProject = await tsUtils.isUsingTypeScript(appDir);
  const outDir = await tsUtils.resolveOutDir(appDir);

  if (isTSProject) {
    await tsUtils.compile(appDir, {
      watch: false,
      configOptions: { options: { incremental: true } },
    });
  }

  const distDir = isTSProject ? outDir : appDir;

  return { appDir, distDir };
};
