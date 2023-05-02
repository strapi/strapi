'use strict';

const { getLocalScript } = require('../../utils/helpers');

/**
 * `$ strapi start`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('start')
    .description('Start your Strapi application')
    .action(getLocalScript('start'));
};
