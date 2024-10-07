import { type StrapiCloudCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import action from './action';
import { defineCloudNamespace } from '../../cloud/command';

const command: StrapiCloudCommand = ({ command, ctx }) => {
  const cloud = defineCloudNamespace(command);

  cloud
    .command('environments')
    .description('Alias for cloud environment list')
    .action(() => runAction('list', action)(ctx));

  const environment = cloud
    .command('environment')
    .description('Manage environments for a Strapi Cloud project');
  environment
    .command('list')
    .description('List Strapi Cloud project environments')
    .option('-d, --debug', 'Enable debugging mode with verbose logs')
    .option('-s, --silent', "Don't log anything")
    .action(() => runAction('list', action)(ctx));
};

export default command;
