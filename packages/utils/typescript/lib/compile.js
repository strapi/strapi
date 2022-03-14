'use strict';

const compilers = require('./compilers');
const getConfigPath = require('./utils/get-config-path');
const copyResources = require('./utils/copy-resources');

module.exports = async (srcDir, { watch = false }) => {
  // TODO: Use the Strapi debug logger instead or don't log at all
  console.log(`Starting the compilation for TypeScript files in ${srcDir}`);

  const compiler = watch ? compilers.watch : compilers.basic;
  const configPath = getConfigPath(srcDir);

  compiler.run(configPath);

  await copyResources(srcDir);
};
