'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('services:list')
    .description('List all the application services')
    .action(getLocalScript('services/list'));
};
