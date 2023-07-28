'use strict';

const tsUtils = require('@strapi/typescript-utils');

module.exports = async ({ srcDir, exitOnError = true }) => {
  const isTSProject = await tsUtils.isUsingTypeScript(srcDir);

  if (!isTSProject) {
    throw new Error(`tsconfig file not found in ${srcDir}`);
  }

  const tsconfigPath = tsUtils.getConfigPath(srcDir);

  await tsUtils.typecheck(tsconfigPath, {}, exitOnError);
};
