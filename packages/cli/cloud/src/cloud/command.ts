import { Command } from 'commander';

export function defineCloudNamespace(command: Command): Command {
  return command.command('cloud').description('Manage Strapi Cloud projects');
}
