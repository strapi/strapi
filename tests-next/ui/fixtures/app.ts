import { test as base } from '@playwright/test';

import {
  appPort,
  generateApp,
  startServer,
  type Server,
  type ServerMode,
} from '@strapi/tests-shared';

/** Generated and built once per run by setup/global-setup.ts. */
export const UI_APP_NAME = 'ui';

export interface AppOptions {
  /** How the Strapi server runs. Set per Playwright project. */
  serverMode: ServerMode;
}

export interface AppWorkerFixtures {
  /** The Strapi server of this worker, started once per worker. */
  server: Server;
}

export const test = base.extend<object, AppOptions & AppWorkerFixtures>({
  serverMode: ['develop', { scope: 'worker', option: true }],

  server: [
    async ({ serverMode }, use, workerInfo) => {
      // One app per run for now (workers: 1). Parallel workers will need one app and DB each.
      const app = await generateApp({ name: UI_APP_NAME, overwrite: false });
      const server = await startServer(app, {
        mode: serverMode,
        port: appPort('ui', workerInfo.workerIndex),
        requireAdmin: true,
      });

      await use(server);

      await server.stop();
    },
    { scope: 'worker', timeout: 180_000 },
  ],
});

export { expect } from '@playwright/test';
