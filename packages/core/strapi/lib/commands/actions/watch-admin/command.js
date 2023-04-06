'use strict';

const { getLocalScript } = require('../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi watch-admin`
  command
    .command('watch-admin')
    .option('--browser <name>', 'Open the browser', true)
    .description('Start the admin development server')
    .action(getLocalScript('watch-admin'));
};
