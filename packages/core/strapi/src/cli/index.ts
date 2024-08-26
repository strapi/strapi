import { Command } from 'commander';

import { commands as strapiCommands } from './commands';

import { createLogger } from './utils/logger';
import { loadTsConfig } from './utils/tsconfig';
import { CLIContext } from './types';

const createCLI = async (argv: string[], command = new Command()) => {
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
  for (const commandFactory of strapiCommands) {
    try {
      const subCommand = await commandFactory({ command, argv, ctx });

      // Add this command to the Commander command object
      if (subCommand) {
        command.addCommand(subCommand);
      }
    } catch (e) {
      console.error(`Failed to load command`, e);
    }
  }

  // TODO v6: remove these deprecation notices
  const deprecatedCommands = [
    { name: 'plugin:init', message: 'Please use `npx @strapi/sdk-plugin init` instead.' },
    {
      name: 'plugin:verify',
      message: 'After migrating your plugin to v5, use `strapi-plugin verify`',
    },
    {
      name: 'plugin:watch',
      message: 'After migrating your plugin to v5, use `strapi-plugin watch`',
    },
    {
      name: 'plugin:watch:link',
      message: 'After migrating your plugin to v5, use `strapi-plugin watch:link`',
    },
    {
      name: 'plugin:build',
      message: 'After migrating your plugin to v5, use `strapi-plugin build`',
    },
  ];

  // Add hidden commands for deprecatedCommands that output a warning that the command has been removed.
  deprecatedCommands.forEach(({ name, message }) => {
    const deprecated = new Command(name)
      .command(name)
      .description('(deprecated)')
      .action(() => {
        console.warn(
          `The command ${name} has been deprecated. See the Strapi 5 migration guide for more information.`
        );
        if (message) {
          console.warn(message);
        }
      });
    command.addCommand(deprecated, { hidden: true });
  });
  return command;
};

const runCLI = async (argv = process.argv, command = new Command()) => {
  const commands = await createCLI(argv, command);
  await commands.parseAsync(argv);
};

export { runCLI, createCLI };
