import { Command } from 'commander';

import createAdminUser from './actions/admin/create-user/command';
import resetAdminUserPassword from './actions/admin/reset-user-password/command';
import listComponents from './actions/components/list/command';
import configurationDump from './actions/configuration/dump/command';
import configurationRestore from './actions/configuration/restore/command';
import consoleCommand from './actions/console/command';
import listContentTypes from './actions/content-types/list/command';
import listControllers from './actions/controllers/list/command';
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
import initPluginCommand from './actions/plugin/init/command';
import linkWatchPluginCommand from './actions/plugin/link-watch/command';
import watchPluginCommand from './actions/plugin/watch/command';
import verifyPluginCommand from './actions/plugin/verify/command';

import { createLogger } from './utils/logger';
import { loadTsConfig } from './utils/tsconfig';
import { CLIContext } from './types';

const strapiCommands = {
  createAdminUser,
  resetAdminUserPassword,
  listComponents,
  configurationDump,
  configurationRestore,
  consoleCommand,
  listContentTypes,
  listControllers,
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
  /**
   * Plugins
   */
  buildPluginCommand,
  initPluginCommand,
  linkWatchPluginCommand,
  watchPluginCommand,
  verifyPluginCommand,
} as const;

const buildStrapiCommand = async (argv: string[], command = new Command()) => {
  try {
    // NOTE: this is a hack to allow loading dts commands without make dts a dependency of strapi and thus avoiding circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dtsCommands = require(require.resolve('@strapi/data-transfer')).commands;
    Object.assign(strapiCommands, dtsCommands);
    // eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-missing-require
    const adminCommands = require(require.resolve('@strapi/admin/cli')).commands;
    Object.assign(strapiCommands, adminCommands);
  } catch (e) {
    // noop
  }

  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  // Help command
  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  const keys = Object.keys(strapiCommands) as (keyof typeof strapiCommands)[];

  const cwd = process.cwd();

  const hasDebug = argv.includes('--debug');
  const hasSilent = argv.includes('--silent');

  const logger = createLogger({ debug: hasDebug, silent: hasSilent, timestamp: false });

  const tsconfig = loadTsConfig({
    cwd,
    path: 'tsconfig.json',
    logger,
  });

  const ctx = {
    cwd,
    logger,
    tsconfig,
  } satisfies CLIContext;

  // Load all commands
  keys.forEach((name) => {
    try {
      // Add this command to the Commander command object
      strapiCommands[name]({ command, argv, ctx });
    } catch (e) {
      console.error(`Failed to load command ${name}`, e);
    }
  });

  return command;
};

const runStrapiCommand = async (argv = process.argv, command = new Command()) => {
  const commands = await buildStrapiCommand(argv, command);
  await commands.parseAsync(argv);
};

export { runStrapiCommand, buildStrapiCommand, strapiCommands };
