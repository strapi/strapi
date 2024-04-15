import { Command } from 'commander';
import { createLogger } from './services/logger';
import { CLIContext } from './types';
import { cli } from './index';

function buildStrapiCloudCommand(argv = process.argv, command = new Command()) {
  const cloudCommands = {
    loginCommand: cli.login.command,
    logoutCommand: cli.logout.command,
    deployCommand: cli.deployProject.command,
  } as const;

  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  // Debug and silent options
  command.option('-d, --debug', 'Output extra debugging');
  command.option('-s, --silent', 'Output less information');

  const cwd = process.cwd();

  const hasDebug = argv.includes('--debug');
  const hasSilent = argv.includes('--silent');

  const logger = createLogger({ debug: hasDebug, silent: hasSilent, timestamp: false });

  const ctx = {
    cwd,
    logger,
  } satisfies CLIContext;

  const keys = Object.keys(cloudCommands) as (keyof typeof cloudCommands)[];

  // Load all commands
  keys.forEach((name) => {
    try {
      // Add this command to the Commander command object
      cloudCommands[name]({ command, argv, ctx });
    } catch (e) {
      console.error(`Failed to load command ${name}`, e);
    }
  });
}

function runStrapiCloudCommand(argv = process.argv, command = new Command()) {
  buildStrapiCloudCommand(argv, command);
  command.parse(argv);
}

export { buildStrapiCloudCommand, runStrapiCloudCommand };
