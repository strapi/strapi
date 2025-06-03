import { createCommand } from 'commander';
import { type StrapiCloudCommand } from '../types';
import { runAction } from '../utils/helpers';
import action from './action';

/**
 * `$ deploy project to the cloud`
 */
const command: StrapiCloudCommand = ({ ctx }) => {
  return createCommand('cloud:deploy')
    .alias('deploy')
    .description('Deploy a Strapi Cloud project')
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .option('-f, --force', 'Skip confirmation to deploy')
    .option('-e, --env <name>', 'Specify the environment to deploy')
    .action((opts) => runAction('deploy', action)(ctx, opts));
};

export default command;
