import { Command, program } from 'commander';
import chalk from 'chalk';
import os from 'node:os';

import { version } from '../../package.json';

/**
 * Adds a command to the program and attach common options
 */
const command = (name: string, description: string): Command => {
  return program
    .command(name)
    .description(description)
    .option('--dry-run', "Run the upgrade, but don't update the files", false)
    .option('-d, --debug', 'Get more logs in debug mode', false)
    .option('-s, --silent', "Don't log anything", false)
    .option('-p, --project-path <project-path>', 'Path to the Strapi project');
};

const RELEASES_CHOICES = Object.values(VersionRelease).join(', ');
const ALLOWED_TARGETS = `Allowed choices are ${RELEASES_CHOICES} or a specific version number in the form "x.x.x"`;

program
  .description('Upgrade to the desired version')
  .option('-p, --project-path <project-path>', 'Path to the Strapi project')
  .addOption(
    new Option('-t, --target <target>', `Specify which version to upgrade to ${ALLOWED_TARGETS}`)
      .default(VersionRelease.Next)
      .argParser((target) => {
        assert(isVersion(target), new InvalidOptionArgumentError(ALLOWED_TARGETS));
        return target;
      })
  )
  .option(
    '-e --exact',
    'If <target> is in the form "x.x.x", only run the upgrade for this version',
    false
  )
  .option('-n, --dry-run', 'Simulate the upgrade without updating any files', false)
  .option('-d, --debug', 'Get more logs in debug mode', false)
  .option('-s, --silent', "Don't log anything", false)
  .action(async () => {
    const options = program.opts<CLIOptions>();

    process.exit(1);
  })
  .helpOption('-h, --help', 'Print command line options')
  .version(version);

// Run the CLI
program.parse(process.argv);
