'use strict';

const { loadProjectScript } = require('../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi develop`
  command
    .command('develop')
    .alias('dev')
    .option('--no-build', 'Disable build')
    .option('--watch-admin', 'Enable watch', false)
    .option('--polling', 'Watch for file changes in network directories', false)
    .option('--browser <name>', 'Open the browser', true)
    .description('Start your Strapi application in development mode')
    .action(loadProjectScript('develop'));
};
