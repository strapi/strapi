import { type StrapiCloudCommand } from '../types';
import action from './action';

/**
 * `$ link local directory to project of the cloud`
 */
const command: StrapiCloudCommand = ({ command, ctx }) => {
  command
    .command('cloud:link')
    .alias('link')
    .description('Link a local directory to a Strapi Cloud project')
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .action(() => action(ctx));
};

export default command;
