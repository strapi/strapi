'use strict';

const compilers = require('./compilers');
const getConfigPath = require('./utils/get-config-path');

module.exports = async (srcDir, { watch = false, configOptions = {} } = {}) => {
  // TODO: Use the Strapi debug logger instead or don't log at all
  process.stderr.write(`Starting the compilation for TypeScript files in ${srcDir}\n`);

  const compiler = watch ? compilers.watch : compilers.basic;
  const configPath = getConfigPath(srcDir);

  compiler.run(configPath, configOptions);
};
