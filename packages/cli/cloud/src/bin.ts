import { Command } from 'commander';
import { getCommandPath, isDependencyInCwd } from '@strapi/utils';
import chalk from 'chalk';
import { createLogger } from './services';
import { getContext, setContext } from './services/context';
import { CLIContext } from './types';
import { buildStrapiCloudCommands } from './index';

async function loadStrapiCloudCommand(argv = process.argv, command = new Command()) {
  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  const cwd = process.cwd();

  command.hook('preAction', (_thisCommand, actionCommand) => {
    if (isDependencyInCwd('@strapi/strapi', cwd)) return;

    const commandName = chalk.yellow(`strapi ${getCommandPath(actionCommand)}`);
    const message = `You need to run ${commandName} in a Strapi project. Make sure you are in the right directory.`;
    console.log(message);
    process.exit(1);
  });

  const hasDebug = argv.includes('--debug');
  const hasSilent = argv.includes('--silent');

  const logger = createLogger({ debug: hasDebug, silent: hasSilent, timestamp: false });

  setContext({
    user: { id: '' },
    cwd,
    logger,
  });

  const ctx: CLIContext = getContext();

  // the commands are registered asynchronously, so this has to settle before the
  // program is parsed, otherwise nothing is registered by the time it runs
  await buildStrapiCloudCommands({ command, ctx, argv });
}

async function runStrapiCloudCommand(argv = process.argv, command = new Command()) {
  await loadStrapiCloudCommand(argv, command);

  try {
    await command.parseAsync(argv);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export { runStrapiCloudCommand };
