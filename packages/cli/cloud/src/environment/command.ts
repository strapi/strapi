import { Command } from 'commander';
import { defineCloudNamespace } from '../cloud/command';

let environmentCmd: Command | null = null;

export const initializeEnvironmentCommand = (command: Command, ctx: unknown): Command => {
  if (!environmentCmd) {
    const cloud = defineCloudNamespace(command, ctx);
    environmentCmd = cloud.command('environment').description('Manage environments');
  }
  return environmentCmd;
};
