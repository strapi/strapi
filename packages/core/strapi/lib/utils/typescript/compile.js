'use strict';

const compilers = require('./compilers');
const getConfigPath = require('./get-config-path');
const copyResources = require('./copy-resources');

module.exports = async (srcDir, { watch = false }) => {
  console.log(`Starting the compilation for TypeScript files in ${srcDir}`);

  const compiler = watch ? compilers.watch : compilers.basic;
  const configPath = getConfigPath(srcDir);

  compiler.run(configPath);

  await copyResources(srcDir);
};
