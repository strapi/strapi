import { Command } from 'commander';
import { defineCloudNamespace } from '../cloud/command';

export function createEnvironmentCommand(command: Command): Command {
  const cloud = defineCloudNamespace(command);
  return cloud.command('environment').description('Manage environments for a Strapi Cloud project');
}
