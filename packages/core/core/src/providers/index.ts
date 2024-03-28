import admin from './admin';
import coreStore from './coreStore';
import cron from './cron';
import registries from './registries';
import telemetry from './telemetry';
import webhooks from './webhooks';

import type { Provider } from './provider';

export const providers: Provider[] = [registries, admin, coreStore, webhooks, telemetry, cron];
