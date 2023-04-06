'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command }) => {
  // `$ strapi generate:template <directory>`
  command
    .command('templates:generate <directory>')
    .description('Generate template from Strapi project')
    .action(getLocalScript('template/generate'));
};
