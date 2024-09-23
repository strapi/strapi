import os from 'os';
import chalk from 'chalk';
import { program } from 'commander';

import { register as registerUpgradeCommands } from './commands/upgrade';
import { register as registerCodemodsCommands } from './commands/codemods';

import { version as packageJSONVersion } from '../../package.json';

registerUpgradeCommands(program);
registerCodemodsCommands(program);

program
  .usage('<command> [options]')
  .on('command:*', ([invalidCmd]) => {
    console.error(
      chalk.red(
        `[ERROR] Invalid command: ${invalidCmd}.${os.EOL} See --help for a list of available commands.`
      )
    );

    process.exit(1);
  })
  .helpOption('-h, --help', 'Print command line options')
  .addHelpCommand('help [command]', 'Print options for a specific command')
  .version(packageJSONVersion)
  .parse(process.argv);
