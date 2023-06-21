'use strict';

const tsUtils = require('@strapi/typescript-utils');

const { buildAdmin } = require('../../builders');

/**
 * @typedef BuildActionArgs
 * @property {"vite" | "webpack"} builder
 */

/**
 * `$ strapi build`
 *
 * @type {({ builder }: BuildActionArgs) => Promise<void>}
 */
module.exports = async ({ builder }) => {
  const cwd = process.cwd();

  const isTSProject = await tsUtils.isUsingTypeScript(cwd);

  let distDir = cwd;

  /**
   * @type {string | undefined}
   */
  let tsconfig;

  if (isTSProject) {
    distDir = await tsUtils.resolveOutDir(cwd);
    tsconfig = await tsUtils.getConfigPath(cwd);
  }

  /**
   * @note
   *
   * Currently this just builds the admin – should this actually build the plugins in your application too?
   * If so we can create a build pipeline queue e.g we build your plugins first then the admin.
   */

  await buildAdmin({
    distDir,
    cwd,
    tsconfig,
    builder,
  });
};
