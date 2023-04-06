'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi generate:template <directory>`
  command
    .command('templates:generate <directory>')
    .description('Generate template from Strapi project')
    .action(getLocalScript('templates/generate'));
};
