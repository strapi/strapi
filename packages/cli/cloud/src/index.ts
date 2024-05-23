import { Command } from 'commander';
import crypto from 'crypto';
import deployProject from './deploy-project';
import login from './login';
import logout from './logout';
import createProject from './create-project';
import { CLIContext } from './types';
import { getLocalConfig, saveLocalConfig } from './config/local';

export const cli = {
  deployProject,
  login,
  logout,
  createProject,
};

const cloudCommands = [deployProject, login, logout];

async function initCloudCLIConfig() {
  const localConfig = getLocalConfig();

  if (!localConfig.deviceId) {
    localConfig.deviceId = crypto.randomUUID();
  }

  saveLocalConfig(localConfig);
}

export function buildStrapiCloudCommands({
  command,
  ctx,
  argv,
}: {
  command: Command;
  ctx: CLIContext;
  argv: string[];
}) {
  initCloudCLIConfig();
  // Load all commands
  cloudCommands.forEach((cloudCommand) => {
    try {
      // Add this command to the Commander command object
      cloudCommand.command({ command, ctx, argv });
    } catch (e) {
      console.error(`Failed to load command ${cloudCommand.name}`, e);
    }
  });
}

export * as services from './services';

export * from './types';
