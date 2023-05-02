'use strict';

const { getLocalScript } = require('../../utils/helpers');

/**
 * `$ strapi develop`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('develop')
    .alias('dev')
    .option('--no-build', 'Disable build')
    .option('--watch-admin', 'Enable watch', false)
    .option('--polling', 'Watch for file changes in network directories', false)
    .option('--browser <name>', 'Open the browser', true)
    .description('Start your Strapi application in development mode')
    .action(getLocalScript('develop'));
};
