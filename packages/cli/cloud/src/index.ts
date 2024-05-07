import { Command } from 'commander';
import deployProject from './deploy-project';
import login from './login';
import logout from './logout';
import createProject from './create-project';
import { CLIContext } from './types';

export const cli = {
  deployProject,
  login,
  logout,
  createProject,
};

const cloudCommands = [deployProject, login, logout];

export function buildStrapiCloudCommands({
  command,
  ctx,
  argv,
}: {
  command: Command;
  ctx: CLIContext;
  argv: string[];
}) {
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
