import { test as base } from '@playwright/test';

import {
  SQLITE,
  appPort,
  generateApp,
  resetDatabase,
  restoreDatabase,
  snapshotDatabase,
  startServer,
  type Server,
  type ServerMode,
} from '@strapi/tests-shared';

/** Generated and built once per run by setup/global-setup.ts. */
export const UI_APP_NAME = 'ui';

/**
 * When the database goes back to the worker's snapshot (RFC D4):
 * - `file` (default): before the first test of each spec file, so the tests of a file can build
 *   on each other's data but never see another file's;
 * - `test`: before every test.
 * Override it per file with `test.use({ resetScope: 'test' })`.
 */
export type ResetScope = 'file' | 'test';

export interface AppOptions {
  /** How the Strapi server runs. Set per Playwright project. */
  serverMode: ServerMode;
}

export interface ResetOptions {
  resetScope: ResetScope;
}

export interface AppWorkerFixtures {
  /** The Strapi server of this worker, started once per worker. */
  server: Server;
  /** The spec file whose data is in the database, so file scope knows when to reset. */
  databaseOwner: { file?: string };
}

export interface ResetFixtures {
  /** Restores the snapshot before a test, following `resetScope`. Automatic. */
  databaseReset: void;
}

export const test = base.extend<ResetOptions & ResetFixtures, AppOptions & AppWorkerFixtures>({
  serverMode: ['develop', { scope: 'worker', option: true }],
  resetScope: ['file', { option: true }],

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
      // A worker restarted after a failure must not start on the previous worker's data.
      await resetDatabase(app, SQLITE);
      const server = await startServer(app, {
        mode: serverMode,
        // parallelIndex stays in [0, workers): workerIndex goes up each time a worker restarts
        // after a failure, which would walk the port out of the ui range.
        port: appPort('ui', workerInfo.parallelIndex),
        requireAdmin: true,
      });
      // The state every reset goes back to. Seeding and role logins (CMS-1947, CMS-1951) come
      // before this, so their admin sessions survive the resets.
      await snapshotDatabase(server);

      await use(server);

      await server.stop();
    },
    { scope: 'worker', timeout: 180_000 },
  ],

  databaseOwner: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use({});
    },
    { scope: 'worker' },
  ],

  databaseReset: [
    async ({ server, resetScope, databaseOwner }, use, testInfo) => {
      // The first test of a worker already starts on the snapshot.
      const dirty = databaseOwner.file !== undefined;
      if (dirty && (resetScope === 'test' || databaseOwner.file !== testInfo.file)) {
        await restoreDatabase(server);
      }
      databaseOwner.file = testInfo.file;

      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
