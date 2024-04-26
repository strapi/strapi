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
    .addHelpText('after', '\nAfter running this command, you will be prompted to enter your authentication information.')
    .action(() => runAction('login', action)(ctx));
};

export default command;
