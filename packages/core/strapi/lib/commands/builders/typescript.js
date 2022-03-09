'use strict';

const tsUtils = require('../../utils/typescript');

module.exports = async ({ srcDir, watch = false }) => {
  const isTSProject = await tsUtils.isTypeScriptProject(srcDir);

  if (!isTSProject) {
    throw new Error(`tsconfig file not found in ${srcDir}`);
  }

  return tsUtils.compile(srcDir, { watch });
};
