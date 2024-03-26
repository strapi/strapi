import type { StrapiCommand } from '../../../types';
import { runAction } from '../../../utils/helpers';
import action from './action';

/**
 * `$ strapi admin:reset-user-password`
 */
const command: StrapiCommand = ({ command }) => {
  command
    .command('admin:reset-user-password')
    .alias('admin:reset-password')
    .description("Reset an admin user's password")
    .option('-e, --email <email>', 'The user email')
    .option('-p, --password <password>', 'New password for the user')
    .action(runAction('admin:reset-user-password', action));
};

export default command;
