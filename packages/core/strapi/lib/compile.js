'use strict';

const tsUtils = require('@strapi/typescript-utils');

/**
 * @param {object} [options]
 * @param {string} [options.appDir]
 * @param {boolean} [options.ignoreDiagnostics]
 */
module.exports = async (options = {}) => {
  const { appDir = process.cwd(), ignoreDiagnostics = false } = options;
  const isTSProject = await tsUtils.isUsingTypeScript(appDir);
  const outDir = await tsUtils.resolveOutDir(appDir);

  if (isTSProject) {
    await tsUtils.compile(appDir, {
      configOptions: { options: { incremental: true }, ignoreDiagnostics },
    });
  }

  const distDir = isTSProject ? outDir : appDir;

  return { appDir, distDir };
};
