import admin from './admin';
import ai from './ai';
import coreStore from './coreStore';
import cron from './cron';
import performanceMonitor from './performance-monitor';
import registries from './registries';
import sessionManager from './session-manager';
import telemetry from './telemetry';
import webhooks from './webhooks';

import type { Provider } from './provider';

export const providers: Provider[] = [
  registries,
  performanceMonitor,
  admin,
  ai,
  coreStore,
  sessionManager,
  webhooks,
  telemetry,
  cron,
];
