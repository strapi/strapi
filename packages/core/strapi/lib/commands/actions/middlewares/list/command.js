'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi middlewares:list`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('middlewares:list')
    .description('List all the application middlewares')
    .action(getLocalScript('middlewares/list'));
};
