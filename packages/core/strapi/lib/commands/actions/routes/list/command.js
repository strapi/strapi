'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('routes:list')
    .description('List all the application routes')
    .action(getLocalScript('routes/list'));
};
