import { createCommand } from 'commander';
import { type StrapiCloudCommand } from '../types';
import action from './action';

/**
 * `$ create project in Strapi cloud`
 */
const command: StrapiCloudCommand = ({ ctx }) => {
  return createCommand('cloud:create-project')
    .description('Create a Strapi Cloud project')
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .action(async () => {
      await action(ctx);
    });
};

export default command;
