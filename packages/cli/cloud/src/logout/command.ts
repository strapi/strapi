import { createCommand } from 'commander';
import type { StrapiCloudCommand } from '../types';
import action from './action';

/**
 * `$ cloud device flow logout`
 */
const command: StrapiCloudCommand = ({ ctx }) => {
  return createCommand('cloud:logout')
    .alias('logout')
    .description('Strapi Cloud Logout')
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .action(() => action(ctx));
};

export default command;
