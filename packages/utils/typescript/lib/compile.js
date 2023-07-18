'use strict';

const compilers = require('./compilers');
const getConfigPath = require('./utils/get-config-path');

module.exports = async (srcDir, { watch = false, configOptions = {} } = {}) => {
  const compiler = watch ? compilers.watch : compilers.basic;
  const configPath = getConfigPath(srcDir);

  compiler.run(configPath, configOptions);
};
