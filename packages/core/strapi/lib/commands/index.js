'use strict';

const { Command } = require('commander');

const strapiCommands = {
  'admin/create-user': require('./actions/admin/create-user/command'),
  'admin/reset-user-password': require('./actions/admin/reset-user-password/command'),
  build: require('./actions/build-command/command'), // in 'build-command' to avoid problems with 'build' being commonly ignored
  'components/list': require('./actions/components/list/command'),
  'configuration/dump': require('./actions/configuration/dump/command'),
  'configuration/restore': require('./actions/configuration/restore/command'),
  console: require('./actions/console/command'),
  'content-types/list': require('./actions/content-types/list/command'),
  'controllers/list': require('./actions/controllers/list/command'),
  develop: require('./actions/develop/command'),
  export: require('./actions/export/command'),
  generate: require('./actions/generate/command'),
  'hooks/list': require('./actions/hooks/list/command'),
  import: require('./actions/import/command'),
  install: require('./actions/install/command'),
  'middlewares/list': require('./actions/middlewares/list/command'),
  new: require('./actions/new/command'),
  'policies/list': require('./actions/policies/list/command'),
  report: require('./actions/report/command'),
  'routes/list': require('./actions/routes/list/command'),
  'services/list': require('./actions/services/list/command'),
  start: require('./actions/start/command'),
  'telemetry/disable': require('./actions/telemetry/disable/command'),
  'telemetry/enable': require('./actions/telemetry/enable/command'),
  'templates/generate': require('./actions/templates/generate/command'),
  transfer: require('./actions/transfer/command'),
  'ts/generate-types': require('./actions/ts/generate-types/command'),
  uninstall: require('./actions/uninstall/command'),
  version: require('./actions/version/command'),
  'watch-admin': require('./actions/watch-admin/command'),
};

const buildStrapiCommand = (argv, command = new Command()) => {
  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  // Load all commands
  Object.keys(strapiCommands).forEach((name) => {
    try {
      // Add this command to the Commander command object
      strapiCommands[name]({ command, argv });
    } catch (e) {
      console.error(`Failed to load command ${name}`, e);
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
  strapiCommands,
};
