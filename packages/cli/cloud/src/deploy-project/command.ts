import { type StrapiCloudCommand } from '../types';
import { runAction } from '../utils/helpers';
import action from './action';

/**
 * `$ deploy project to the cloud`
 */
const command: StrapiCloudCommand = ({ command, ctx }) => {
  return command
    .command('cloud:deploy')
    .alias('deploy')
    .description('Deploy a Strapi Cloud project')
    .action(() => runAction('deploy', action)(ctx));
};

export default command;
