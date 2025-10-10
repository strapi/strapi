import { type StrapiCloudCommand } from '../types';
import { runAction } from '../utils/helpers';
import action from './action';

/**
 * `$ list project from the cloud`
 */
const command: StrapiCloudCommand = ({ command, ctx }) => {
  command
    .command('cloud:projects')
    .alias('projects')
    .description('List Strapi Cloud projects')
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .action(() => runAction('projects', action)(ctx));
};

export default command;
