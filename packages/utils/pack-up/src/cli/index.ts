import { program } from 'commander';
import chalk from 'chalk';

import { version } from '../../package.json';

const command = (name: string) =>
  program
    .command(name)
    .option('-d, --debug', 'Get more logs in debug mode', false)
    .option('-s, --silent', "Don't log anything", false);

command('Build Package')
  .alias('build')
  .action(async (options) => {
    const { build } = await import('./commands/build');

    return build(options);
  });

program
  .usage('<command> [options]')
  .on('command:*', ([invalidCmd]) => {
    console.error(
      chalk.red(
        `[ERROR] Invalid command: ${invalidCmd}.\n See --help for a list of available commands.`
      )
    );

    process.exit(1);
  })
  .helpOption('-h, --help', 'Print command line options')
  .addHelpCommand('help [command]', 'Print options for a specific command')
  .version(version)
  .parse(process.argv);
