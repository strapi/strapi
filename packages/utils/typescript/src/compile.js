'use strict';

const compilers = require('./compilers');
const { getConfigPath } = require('./utils/get-config-path');

const compile = async (srcDir, { configOptions = {} } = {}) => {
  const configPath = getConfigPath(srcDir);

  compilers.basic.run(configPath, configOptions);
};

module.exports = { compile };
