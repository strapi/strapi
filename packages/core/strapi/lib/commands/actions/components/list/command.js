'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi components:list`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('components:list')
    .description('List all the application components')
    .action(getLocalScript('components/list'));
};
