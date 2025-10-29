import admin from './admin';
import coreStore from './coreStore';
import contentAuditLogs from './content-audit-logs';
import cron from './cron';
import registries from './registries';
import sessionManager from './session-manager';
import telemetry from './telemetry';
import webhooks from './webhooks';

import type { Provider } from './provider';

export const providers: Provider[] = [
  registries,
  admin,
  coreStore,
  contentAuditLogs,
  sessionManager,
  webhooks,
  telemetry,
  cron,
];
