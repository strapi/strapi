import { runAction } from '../../../utils/helpers';
import type { StrapiCommand } from '../../../types';
import action from './action';

/**
 * `$ strapi admin:create-user`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('admin:create-user')
    .alias('admin:create')
    .description('Create a new admin')
    .option('-e, --email <email>', 'Email of the new admin')
    .option('-p, --password <password>', 'Password of the new admin')
    .option('-f, --firstname <first name>', 'First name of the new admin')
    .option('-l, --lastname <last name>', 'Last name of the new admin')
    .action(runAction('admin:create-user', action));
};

export default command;
