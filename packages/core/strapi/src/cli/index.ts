import { Command } from 'commander';

import { getCommandPath, isDependencyInCwd } from '@strapi/utils';
import chalk from 'chalk';
import { commands as strapiCommands } from './commands';

import { createLogger } from './utils/logger';
import { loadTsConfig, type TsConfig } from './utils/tsconfig';
import { CLIContext } from './types';
import { version } from '../../package.json';

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

/**
 * Commands that are runnable outside of a Strapi project, and therefore must not
 * be rejected by the pre-action check.
 */
const projectAgnosticCommands = new Set(['version', ...deprecatedCommands.map(({ name }) => name)]);

const createCLI = async (argv: string[], command = new Command()) => {
  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  command.version(version, '-v, --version', 'Output the version number');

  const cwd = process.cwd();

  command.hook('preAction', (_thisCommand, actionCommand) => {
    if (projectAgnosticCommands.has(actionCommand.name())) return;
    if (isDependencyInCwd('@strapi/strapi', cwd)) return;

    const commandName = chalk.yellow(`strapi ${getCommandPath(actionCommand)}`);
    const message = `You need to run ${commandName} in a Strapi project. Make sure you are in the right directory.`;
    console.log(message);
    process.exit(1);
  });

  const hasDebug = argv.includes('--debug');
  const hasSilent = argv.includes('--silent');

  const logger = createLogger({ debug: hasDebug, silent: hasSilent, timestamp: false });

  // Lazy: defer `loadTsConfig` (which loads `typescript`) until first read
  let tsconfig: TsConfig | undefined;
  let loaded = false;
  const ctx = { cwd, logger } as CLIContext;
  Object.defineProperty(ctx, 'tsconfig', {
    enumerable: true,
    get() {
      if (!loaded) {
        loaded = true;
        tsconfig = loadTsConfig({ cwd, path: 'tsconfig.json', logger });
      }
      return tsconfig;
    },
  });

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

  try {
    await commands.parseAsync(argv);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export { runCLI, createCLI };
