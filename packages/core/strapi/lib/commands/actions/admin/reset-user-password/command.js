'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('admin:reset-user-password')
    .alias('admin:reset-password')
    .description("Reset an admin user's password")
    .option('-e, --email <email>', 'The user email')
    .option('-p, --password <password>', 'New password for the user')
    .action(getLocalScript('admin/reset-user-password'));
};
