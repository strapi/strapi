import os from 'os';
import chalk from 'chalk';
import { Option, program } from 'commander';

import { version as packageJSONVersion } from '../../package.json';
import { Version } from '../modules/version';

import type { CLIOptions } from './types';

const projectPathOption = new Option(
  '-p, --project-path <project-path>',
  'Path to the Strapi project'
);

const dryOption = new Option(
  '-n, --dry',
  'Simulate the upgrade without updating any files'
).default(false);

const debugOption = new Option('-d, --debug', 'Get more logs in debug mode').default(false);

const silentOption = new Option('-s, --silent', "Don't log anything").default(false);

const automaticConfirmationOption = new Option(
  '-y, --yes',
  'Automatically answer "yes" to any prompts that the CLI might print on the command line.'
).default(false);

const addReleaseUpgradeCommand = (releaseType: Version.ReleaseType, description: string) => {
  program
    .command(releaseType)
    .description(description)
    .addOption(projectPathOption)
    .addOption(dryOption)
    .addOption(debugOption)
    .addOption(silentOption)
    .addOption(automaticConfirmationOption)
    .action(async (options: CLIOptions) => {
      const { upgrade } = await import('./commands/upgrade.js');

      return upgrade({ ...options, target: releaseType });
    });
};

addReleaseUpgradeCommand(
  Version.ReleaseType.Major,
  'Upgrade to the next available major version of Strapi'
);

addReleaseUpgradeCommand(
  Version.ReleaseType.Minor,
  'Upgrade to the latest minor and patch version of Strapi for the current major'
);

addReleaseUpgradeCommand(
  Version.ReleaseType.Patch,
  'Upgrade to latest patch version of Strapi for the current major and minor'
);

program
  .command('codemods')
  .description(
    'Run a set of available codemods for the selected target version without updating the Strapi dependencies'
  )
  .addOption(projectPathOption)
  .addOption(dryOption)
  .addOption(debugOption)
  .addOption(silentOption)
  .addOption(automaticConfirmationOption)
  .action(async (options) => {
    const { runCodemods } = await import('./commands/codemods.js');
    return runCodemods({ ...options, target: Version.ReleaseType.Major });
  });

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
