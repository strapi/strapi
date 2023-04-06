'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('middlewares:list')
    .description('List all the application middlewares')
    .action(getLocalScript('middlewares/list'));
};
