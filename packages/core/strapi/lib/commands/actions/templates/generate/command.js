'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 *`$ strapi templates:generate <directory>`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('templates:generate <directory>')
    .description('Generate template from Strapi project')
    .action(getLocalScript('templates/generate'));
};
