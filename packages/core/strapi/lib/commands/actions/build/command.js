'use strict';

const { getLocalScript } = require('../../utils/helpers');

/**
 * `$ strapi build`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('build')
    .option('--no-optimization', 'Build the admin app without optimizing assets')
    .description('Build the strapi admin app')
    .action(getLocalScript('build-action')); // TODO: fix gitignore so that this folder can be called build
};
