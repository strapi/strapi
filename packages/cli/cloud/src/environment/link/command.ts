import { type StrapiCloudCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';
import { initializeEnvironmentCommand } from '../command';

const command: StrapiCloudCommand = ({ command, ctx }) => {
  const environmentCmd = initializeEnvironmentCommand(command, ctx);

  environmentCmd
    .command('link')
    .description('Link project to a specific Strapi Cloud project environment')
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .action(() => runAction('link', action)(ctx));
};

export default command;
