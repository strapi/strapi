import { Command } from 'commander';

import { commands as strapiCommands } from './commands';

import { createLogger } from './utils/logger';
import { loadTsConfig } from './utils/tsconfig';
import { CLIContext } from './types';

const createCLI = async (argv: string[], command = new Command()) => {
  try {
    // NOTE: this is a hack to allow loading dts commands without make dts a dependency of strapi and thus avoiding circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dtsCommands = require(require.resolve('@strapi/data-transfer')).commands;
    strapiCommands.push(...dtsCommands);
  } catch (e) {
    // noop
  }

  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  command.version(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../package.json').version,
    '-v, --version',
    'Output the version number'
  );

  const cwd = process.cwd();

  const hasDebug = argv.includes('--debug');
  const hasSilent = argv.includes('--silent');

  const logger = createLogger({ debug: hasDebug, silent: hasSilent, timestamp: false });

  const tsconfig = loadTsConfig({
    cwd,
    path: 'tsconfig.json',
    logger,
  });

  const ctx = {
    cwd,
    logger,
    tsconfig,
  } satisfies CLIContext;

  // Load all commands
  strapiCommands.forEach((commandFactory) => {
    try {
      const subCommand = commandFactory({ command, argv, ctx });

      // Add this command to the Commander command object
      if (subCommand) {
        command.addCommand(subCommand);
      }
    } catch (e) {
      console.error(`Failed to load command`, e);
    }
  });

  return command;
};

const runCLI = async (argv = process.argv, command = new Command()) => {
  const commands = await createCLI(argv, command);
  await commands.parseAsync(argv);
};

export { runCLI, createCLI };
