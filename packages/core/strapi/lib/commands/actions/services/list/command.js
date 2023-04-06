'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi services:list`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('services:list')
    .description('List all the application services')
    .action(getLocalScript('services/list'));
};
