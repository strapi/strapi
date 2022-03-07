'use strict';

const compilers = require('../compilers');
const getConfigPath = require('../get-config-path');
const copyResources = require('../copy-resources');

/**
 * @param {string} dir
 */
module.exports = async dir => {
  console.log('Compiling TypeScript files...');

  const configPath = getConfigPath(dir);

  compilers.basic.run(configPath);

  await copyResources(dir);
};
