import { Command } from 'commander';
import listAction from '../environment/list/action';
import { CLIContext } from '../types';

export function defineCloudNamespace(command: Command, ctx: CLIContext): Command {
  const cloud = command.command('cloud').description('Manage Strapi Cloud projects');

  // Define cloud namespace aliases:
  cloud
    .command('environments')
    .description('Alias for cloud environment list')
    .action(() => listAction(ctx));
  return cloud;
}
