'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('controllers:list')
    .description('List all the application controllers')
    .action(getLocalScript('controllers/list'));
};
