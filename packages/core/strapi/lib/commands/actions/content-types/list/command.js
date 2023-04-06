'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('content-types:list')
    .description('List all the application content-types')
    .action(getLocalScript('content-types/list'));
};
