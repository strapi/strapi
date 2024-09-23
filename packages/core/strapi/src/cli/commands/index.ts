import { buildStrapiCloudCommands as cloudCommands } from '@strapi/cloud-cli';

import { command as createAdminUser } from './admin/create-user';
import { command as resetAdminUserPassword } from './admin/reset-user-password';
import { command as listComponents } from './components/list';
import { command as configurationDump } from './configuration/dump';
import { command as configurationRestore } from './configuration/restore';
import { command as listContentTypes } from './content-types/list';
import { command as listControllers } from './controllers/list';
import { command as listHooks } from './hooks/list';
import { command as listMiddlewares } from './middlewares/list';
import { command as listPolicies } from './policies/list';
import { command as listRoutes } from './routes/list';
import { command as listServices } from './services/list';
import { command as disableTelemetry } from './telemetry/disable';
import { command as enableTelemetry } from './telemetry/enable';
import { command as generateTemplates } from './templates/generate';
import { command as generateTsTypes } from './ts/generate-types';
import { command as buildCommand } from './build';
import { command as consoleCommand } from './console';
import { command as developCommand } from './develop';
import { command as generateCommand } from './generate';
import { command as reportCommand } from './report';
import { command as startCommand } from './start';
import { command as versionCommand } from './version';
import exportCommand from './export/command';
import importCommand from './import/command';
import transferCommand from './transfer/command';

import { StrapiCommand } from '../types';

export const commands: StrapiCommand[] = [
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
  listMiddlewares,
  listPolicies,
  reportCommand,
  listRoutes,
  listServices,
  startCommand,
  disableTelemetry,
  enableTelemetry,
  generateTemplates,
  generateTsTypes,
  versionCommand,
  buildCommand,
  developCommand,
  exportCommand,
  importCommand,
  transferCommand,
  /**
   * Cloud
   */
  cloudCommands,
];
