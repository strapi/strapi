'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi admin:reset-user-password`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('admin:reset-user-password')
    .alias('admin:reset-password')
    .description("Reset an admin user's password")
    .option('-e, --email <email>', 'The user email')
    .option('-p, --password <password>', 'New password for the user')
    .action(getLocalScript('admin/reset-user-password'));
};
