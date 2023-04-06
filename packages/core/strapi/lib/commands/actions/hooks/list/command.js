'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi hooks:list`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('hooks:list')
    .description('List all the application hooks')
    .action(getLocalScript('hooks/list'));
};
