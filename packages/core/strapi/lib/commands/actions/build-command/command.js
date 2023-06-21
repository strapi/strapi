'use strict';

const { getLocalScript } = require('../../utils/helpers');

/**
 * `$ strapi build`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('build')
    .description('Build the strapi admin app')
    .option(
      '-b, --builder <builder>',
      'Use either webpack (default) or vite to bundle the admin app',
      'webpack'
    )
    .action(getLocalScript('build-command')); // build-command dir to avoid problems with 'build' being commonly ignored
};
