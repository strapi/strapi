import { Command } from 'commander';
import { runAction } from '../utils/helpers';
import listAction from '../environment/list/action';

export function defineCloudNamespace(command: Command, ctx: unknown): Command {
  const cloud = command.command('cloud').description('Manage Strapi Cloud projects');

  // Define cloud namespace aliases:
  cloud
    .command('environments')
    .description('Alias for cloud environment list')
    .action(() => runAction('list', listAction)(ctx));
  return cloud;
}
