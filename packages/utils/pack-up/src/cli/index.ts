import chalk from 'chalk';
import { program } from 'commander';
import os from 'os';

import { version } from '../../package.json';

const command = (name: string) =>
  program
    .command(name)
    .option('-d, --debug', 'Get more logs in debug mode', false)
    .option('-s, --silent', "Don't log anything", false);

command('check').action(async (options) => {
  const { check } = await import('./commands/check');

  return check(options);
});

command('build')
  .option('--sourcemap', 'produce sourcemaps', true)
  .option('--minify', 'minify the output', false)
  .action(async (options) => {
    const { build } = await import('./commands/build');

    return build(options);
  });

command('init')
  .argument('<path>', 'path to the package')
  .option('--template', 'path to a custom template')
  .action(async (path, options) => {
    const { init } = await import('./commands/init');

    return init({ path, ...options });
  });

command('watch').action(async (options) => {
  const { watch } = await import('./commands/watch');

  return watch(options);
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
  .version(version)
  .parse(process.argv);
