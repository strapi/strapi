import { Command } from 'commander';

import createAdminUser from './actions/admin/create-user/command';
import resetAdminUserPassword from './actions/admin/reset-user-password/command';
import buildCommand from './actions/build-command/command'; // in 'build-command' to avoid problems with 'build' being commonly ignored
import listComponents from './actions/components/list/command';
import configurationDump from './actions/configuration/dump/command';
import configurationRestore from './actions/configuration/restore/command';
import consoleCommand from './actions/console/command';
import listContentTypes from './actions/content-types/list/command';
import listControllers from './actions/controllers/list/command';
import developCommand from './actions/develop/command';
import generateCommand from './actions/generate/command';
import listHooks from './actions/hooks/list/command';
import installCommand from './actions/install/command';
import listMiddlewares from './actions/middlewares/list/command';
import newCommand from './actions/new/command';
import listPolicies from './actions/policies/list/command';
import reportCommand from './actions/report/command';
import listRoutes from './actions/routes/list/command';
import listServices from './actions/services/list/command';
import startCommand from './actions/start/command';
import disableTelemetry from './actions/telemetry/disable/command';
import enableTelemetry from './actions/telemetry/enable/command';
import generateTemplates from './actions/templates/generate/command';
import generateTsTypes from './actions/ts/generate-types/command';
import uninstallCommand from './actions/uninstall/command';
import versionCommand from './actions/version/command';
import watchAdminCommand from './actions/watch-admin/command';
import buildPluginCommand from './actions/plugin/build-command/command';

const strapiCommands = {
  createAdminUser,
  resetAdminUserPassword,
  buildCommand,
  listComponents,
  configurationDump,
  configurationRestore,
  consoleCommand,
  listContentTypes,
  listControllers,
  developCommand,
  generateCommand,
  listHooks,
  installCommand,
  listMiddlewares,
  newCommand,
  listPolicies,
  reportCommand,
  listRoutes,
  listServices,
  startCommand,
  disableTelemetry,
  enableTelemetry,
  generateTemplates,
  generateTsTypes,
  uninstallCommand,
  versionCommand,
  watchAdminCommand,
  buildPluginCommand,
} as const;

const buildStrapiCommand = (argv: string[], command = new Command()) => {
  try {
    // NOTE: this is a hack to allow loading dts commands without make dts a dependency of strapi and thus avoiding circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dtsCommands = require(require.resolve('@strapi/data-transfer')).commands;
    Object.assign(strapiCommands, dtsCommands);
  } catch (e) {
    // noop
  }

  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  const keys = Object.keys(strapiCommands) as (keyof typeof strapiCommands)[];

  // Load all commands
  keys.forEach((name) => {
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

export { runStrapiCommand, buildStrapiCommand, strapiCommands };
