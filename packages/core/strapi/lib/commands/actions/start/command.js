'use strict';

const { loadProjectScript } = require('../../scripts/utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi start`
  command
    .command('start')
    .description('Start your Strapi application')
    .action(loadProjectScript('start'));
};
