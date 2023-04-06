'use strict';

const { getLocalScript } = require('../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi start`
  command
    .command('start')
    .description('Start your Strapi application')
    .action(getLocalScript('start'));
};
