'use strict';

const { getLocalScript } = require('../../utils/helpers');

/**
 * `$ strapi watch-admin`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('watch-admin')
    .option('--browser <name>', 'Open the browser', true)
    .description('Start the admin development server')
    .action(getLocalScript('watch-admin'));
};
