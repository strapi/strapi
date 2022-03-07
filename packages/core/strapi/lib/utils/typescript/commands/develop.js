'use strict';

const compilers = require('../compilers');
const getConfigPath = require('../get-config-path');
const copyResources = require('../copy-resources');

/**
 * @param {string} dir
 */
module.exports = async dir => {
  console.log('Compiling TypeScript files and watching for files change...');

  const configPath = getConfigPath(dir);

  compilers.watch.run(configPath);

  await copyResources(dir);
};
