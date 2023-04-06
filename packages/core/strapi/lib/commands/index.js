'use strict';

const { Command } = require('commander');

const availableCommands = [
  'admin/create-user',
  'admin/reset-user-password',
  'build',
  'configuration/dump',
  'configuration/restore',
  'console',
  'content-types/list',
  'controllers/list',
  'develop',
  'export',
  'generate',
  'hooks/list',
  'import',
  'install',
  'middlewares/list',
  'new',
  'policies/list',
  'report',
  'routes/list',
  'services/list',
  'start',
  'telemetry/disable',
  'telemetry/enable',
  'templates/generate',
  'transfer',
  'ts/generate-types',
  'uninstall',
  'version',
  'watch-admin',
];

const buildStrapiCommand = (argv, command = new Command()) => {
  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  // Load all commands
  availableCommands.forEach((cmdPath) => {
    try {
      require(`./actions/${cmdPath}/command`)({ command, argv });
    } catch (e) {
      console.error(`Failed to load command ${cmdPath}`, e);
    }
  });

  return command;
};

const runStrapiCommand = async (argv = process.argv, command = new Command()) => {
  await buildStrapiCommand(argv, command).parseAsync(argv);
};

module.exports = {
  runStrapiCommand,
  buildStrapiCommand,
  availableCommands,
};
