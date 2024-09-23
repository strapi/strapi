import { Command } from 'commander';
import crypto from 'crypto';
import deployProject from './deploy-project';
import link from './link';
import login from './login';
import logout from './logout';
import createProject from './create-project';
import listProjects from './list-projects';
import { CLIContext } from './types';
import { getLocalConfig, saveLocalConfig } from './config/local';

export const cli = {
  deployProject,
  link,
  login,
  logout,
  createProject,
  listProjects,
};

const cloudCommands = [deployProject, link, login, logout, listProjects];

async function initCloudCLIConfig() {
  const localConfig = await getLocalConfig();

  if (!localConfig.deviceId) {
    localConfig.deviceId = crypto.randomUUID();
  }

  await saveLocalConfig(localConfig);
}

export async function buildStrapiCloudCommands({
  command,
  ctx,
  argv,
}: {
  command: Command;
  ctx: CLIContext;
  argv: string[];
}) {
  await initCloudCLIConfig();
  // Load all commands
  for (const cloudCommand of cloudCommands) {
    try {
      // Add this command to the Commander command object
      const subCommand = await cloudCommand.command({ command, ctx, argv });

      if (subCommand) {
        command.addCommand(subCommand);
      }
    } catch (e) {
      console.error(`Failed to load command ${cloudCommand.name}`, e);
    }
  }
}

export * as services from './services';

export * from './types';
