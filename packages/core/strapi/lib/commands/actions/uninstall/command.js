'use strict';

const { getLocalScript } = require('../../utils/helpers');

/**
 * `$ strapi uninstall`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('uninstall [plugins...]')
    .description('Uninstall a Strapi plugin')
    .option('-d, --delete-files', 'Delete files', false)
    .action(getLocalScript('uninstall'));
};
