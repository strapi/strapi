import type { StrapiCloudCommand } from '../types';
import { runAction } from '../utils/helpers';
import action from './action';

/**
 * `$ cloud device flow logout`
 */
const command: StrapiCloudCommand = ({ command, ctx }) => {
  return command
    .command('cloud:logout')
    .alias('logout')
    .description('Strapi Cloud Logout')
    .action(() => runAction('logout', action)(ctx));
};

export default command;
