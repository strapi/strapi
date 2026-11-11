import admin from './admin';
import ai from './ai';
import contentStructure from './content-structure';
import coreStore from './coreStore';
import cron from './cron';
import mcp from './mcp';
import pendingRelations from './pendingRelations';
import registries from './registries';
import sessionManager from './session-manager';
import telemetry from './telemetry';
import webhooks from './webhooks';

import type { Provider } from './provider';

export const providers: Provider[] = [
  registries,
  admin,
  ai,
  contentStructure,
  coreStore,
  pendingRelations,
  sessionManager,
  webhooks,
  telemetry,
  cron,
  mcp,
];
