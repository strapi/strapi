'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi admin:create-user`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('admin:create-user')
    .alias('admin:create')
    .description('Create a new admin')
    .option('-e, --email <email>', 'Email of the new admin')
    .option('-p, --password <password>', 'Password of the new admin')
    .option('-f, --firstname <first name>', 'First name of the new admin')
    .option('-l, --lastname <last name>', 'Last name of the new admin')
    .action(getLocalScript('admin/create-user'));
};
