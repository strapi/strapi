'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('policies:list')
    .description('List all the application policies')
    .action(getLocalScript('policies/list'));
};
