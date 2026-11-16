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
      // One app and DB per run for now: two workers would start two servers on the same SQLite
      // file, and both would run the migrations.
      if (workerInfo.config.workers > 1) {
        throw new Error(
          `The ui suite runs with one worker until each worker gets its own app (got --workers=${workerInfo.config.workers}).`
        );
      }

      const app = await generateApp({ name: UI_APP_NAME, overwrite: false });
      const server = await startServer(app, {
        mode: serverMode,
        // parallelIndex stays in [0, workers): workerIndex goes up each time a worker restarts
        // after a failure, which would walk the port out of the ui range.
        port: appPort('ui', workerInfo.parallelIndex),
        requireAdmin: true,
      });

      await use(server);

      await server.stop();
    },
    { scope: 'worker', timeout: 180_000 },
  ],
});

export { expect } from '@playwright/test';
