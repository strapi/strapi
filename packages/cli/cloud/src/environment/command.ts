import { Command } from 'commander';
import { defineCloudNamespace } from '../cloud/command';

let environmentCmd: Command | null = null;

export const getEnvironmentCommand = (command: Command): Command => {
  if (!environmentCmd) {
    const cloud = defineCloudNamespace(command);
    environmentCmd = cloud.command('environment').description('Manage environments');
  }
  return environmentCmd;
};
