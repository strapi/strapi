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

// Register commands

command('next', 'Upgrade your Strapi application to the next major version').action(
  async (options) => {
    const { next } = await import('./commands/next.js');

    return next(options);
  }
);

command('latest', 'Upgrade your Strapi application to the latest version').action(
  async (options) => {
    const { latest } = await import('./commands/latest.js');

    return latest(options);
  }
);

command('fix-current', 'Run missing upgrades for the current major version').action(
  async (path, options) => {
    const { fixCurrent } = await import('./commands/fix-current.js');

    return fixCurrent({ path, ...options });
  }
);

// Miscellaneous

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
  .version(version);

// Run the CLI
program.parse(process.argv);
