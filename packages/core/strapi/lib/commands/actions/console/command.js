'use strict';

const { getLocalScript } = require('../../scripts/utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi console`
  command
    .command('console')
    .description('Open the Strapi framework console')
    .action(getLocalScript('console'));
};
