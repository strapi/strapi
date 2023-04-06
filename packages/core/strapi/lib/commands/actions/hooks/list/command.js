'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('hooks:list')
    .description('List all the application hooks')
    .action(getLocalScript('hooks/list'));
};
