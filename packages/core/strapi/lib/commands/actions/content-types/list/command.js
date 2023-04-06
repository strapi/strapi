'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi content-types:list`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('content-types:list')
    .description('List all the application content-types')
    .action(getLocalScript('content-types/list'));
};
