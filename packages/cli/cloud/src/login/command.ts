import { createCommand } from 'commander';
import type { StrapiCloudCommand } from '../types';
import { runAction } from '../utils/helpers';
import action from './action';

/**
 * `$ cloud device flow login`
 */
const command: StrapiCloudCommand = ({ ctx }) => {
  return createCommand('cloud:login')
    .alias('login')
    .description('Strapi Cloud Login')
    .addHelpText(
      'after',
      '\nAfter running this command, you will be prompted to enter your authentication information.'
    )
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .action(() => runAction('login', action)(ctx));
};

export default command;
