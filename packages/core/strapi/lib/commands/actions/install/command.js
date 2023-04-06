'use strict';

const { getLocalScript } = require('../../scripts/utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi install`
  command
    .command('install [plugins...]')
    .description('Install a Strapi plugin')
    .action(getLocalScript('install'));
};
