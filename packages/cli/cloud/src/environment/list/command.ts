import { type StrapiCloudCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';
import { initializeEnvironmentCommand } from '../command';

const command: StrapiCloudCommand = ({ command, ctx }) => {
  const environmentCmd = initializeEnvironmentCommand(command, ctx);

  environmentCmd
    .command('list')
    .description('List Strapi Cloud project environments')
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .action(() => runAction('list', action)(ctx));
};

export default command;
