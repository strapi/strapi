import admin from './admin';
import coreStore from './coreStore';
import cron from './cron';
import registries from './registries';
import telemetry from './telemetry';
import webhooks from './webhooks';

type Provider = {
  init?: (strapi: any) => void;
  register?: (strapi: any) => Promise<void>;
  bootstrap?: (strapi: any) => Promise<void>;
  destroy?: (strapi: any) => Promise<void>;
};

export const providers: Provider[] = [registries, admin, coreStore, webhooks, telemetry, cron];
