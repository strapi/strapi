'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi routes:list``
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('routes:list')
    .description('List all the application routes')
    .action(getLocalScript('routes/list'));
};
