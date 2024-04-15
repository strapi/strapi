import type { StrapiCloudCommand } from '../types';
import { runAction } from '../utils/helpers';
import action from './action';

/**
 * `$ cloud device flow login`
 */
const command: StrapiCloudCommand = ({ command, ctx }) => {
  return command
    .command('cloud:login')
    .alias('login')
    .description('Strapi Cloud Login')
    .action(() => runAction('login', action)(ctx));
};

export default command;
