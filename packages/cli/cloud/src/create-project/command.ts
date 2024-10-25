import { type StrapiCloudCommand } from '../types';
import { runAction } from '../utils/helpers';
import action from './action';

/**
 * `$ create project in Strapi cloud`
 */
const command: StrapiCloudCommand = ({ command, ctx }) => {
  command
    .command('cloud:create-project')
    .description('Create a Strapi Cloud project')
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .action(() => runAction('cloud:create-project', action)(ctx));
};

export default command;
