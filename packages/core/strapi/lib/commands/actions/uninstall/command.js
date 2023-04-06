'use strict';

const { getLocalScript } = require('../../scripts/utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi uninstall`
  command
    .command('uninstall [plugins...]')
    .description('Uninstall a Strapi plugin')
    .option('-d, --delete-files', 'Delete files', false)
    .action(getLocalScript('uninstall'));
};
