import { Command } from 'commander';
import { createLogger } from './services';
import { getContext, setContext } from './services/context';
import { CLIContext } from './types';
import { buildStrapiCloudCommands } from './index';

function loadStrapiCloudCommand(argv = process.argv, command = new Command()) {
  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  const cwd = process.cwd();

  const hasDebug = argv.includes('--debug');
  const hasSilent = argv.includes('--silent');

  const logger = createLogger({ debug: hasDebug, silent: hasSilent, timestamp: false });

  setContext({
    user: { id: '' },
    cwd,
    logger,
  });

  const ctx: CLIContext = getContext();

  buildStrapiCloudCommands({ command, ctx, argv });
}

function runStrapiCloudCommand(argv = process.argv, command = new Command()) {
  loadStrapiCloudCommand(argv, command);
  command.parse(argv);
}

export { runStrapiCloudCommand };
