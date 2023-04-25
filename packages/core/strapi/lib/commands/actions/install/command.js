'use strict';

const { getLocalScript } = require('../../utils/helpers');

/**
 * `$ strapi install`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('install [plugins...]')
    .description('Install a Strapi plugin')
    .action(getLocalScript('install'));
};
