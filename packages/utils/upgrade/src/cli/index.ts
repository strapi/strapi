import chalk from 'chalk';
import { program } from 'commander';
import os from 'os';

import { version as packageJSONVersion } from '../../package.json';
import { Version } from '../modules/version';

import type { CLIOptions } from './types';

const addReleaseUpgradeCommand = (releaseType: Version.ReleaseType, description: string) => {
  program
    .command(releaseType)
    .description(description)
    .option('-p, --project-path <project-path>', 'Path to the Strapi project')
    .option('-n, --dry', 'Simulate the upgrade without updating any files', false)
    .option('-d, --debug', 'Get more logs in debug mode', false)
    .option('-s, --silent', "Don't log anything", false)
    .action(async (options: CLIOptions) => {
      const { upgrade } = await import('./commands/upgrade.js');

      return upgrade({ ...options, target: releaseType });
    });
};

addReleaseUpgradeCommand(
  Version.ReleaseType.Major,
  'Upgrade to the next available major version of Strapi'
);

// TODO: Add back the command when adding the support for minor upgrades
// addReleaseUpgradeCommand(
//   Version.ReleaseType.Minor,
//   'Upgrade to the latest minor/patch version of Strapi for the current major'
// );

// TODO: Add back the command when adding the support for patch upgrades
// addReleaseUpgradeCommand(
//   Version.ReleaseType.Patch,
//   'Upgrade to latest patch version of Strapi for the current major and minor'
// );

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
