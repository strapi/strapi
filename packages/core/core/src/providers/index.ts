import admin from './admin';
import caching from './caching';
import coreStore from './coreStore';
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
  caching,
  sessionManager,
  webhooks,
  telemetry,
  cron,
];
