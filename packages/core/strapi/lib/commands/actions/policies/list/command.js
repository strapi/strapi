'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi policies:list`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('policies:list')
    .description('List all the application policies')
    .action(getLocalScript('policies/list'));
};
