'use strict';

const compilers = require('./compilers');
const getConfigPath = require('./utils/get-config-path');

module.exports = async (srcDir = "", { watch = false, configOptions = {}, compileOptions = {} } = {}) => {
  // TODO: Use the Strapi debug logger instead or don't log at all
  console.log(`Starting the compilation for TypeScript files in ${srcDir}`);

  const compiler = watch ? compilers.watch : compilers.basic;
  const configPath = getConfigPath(srcDir, configOptions);

  compiler.run(configPath, compileOptions);
};
