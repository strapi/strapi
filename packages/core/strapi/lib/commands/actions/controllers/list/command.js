'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi controllers:list`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('controllers:list')
    .description('List all the application controllers')
    .action(getLocalScript('controllers/list'));
};
