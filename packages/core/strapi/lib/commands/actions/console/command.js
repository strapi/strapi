'use strict';

const { getLocalScript } = require('../../utils/helpers');

/**
 * `$ strapi console`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('console')
    .description('Open the Strapi framework console')
    .action(getLocalScript('console'));
};
