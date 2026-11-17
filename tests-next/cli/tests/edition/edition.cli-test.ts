import { afterAll, beforeAll, expect, test } from 'vitest';

import {
  appPort,
  databaseFromEnv,
  editionFromEnv,
  generateApp,
  getInstanceFeatures,
  resetDatabase,
  startServer,
  stopAllServers,
  type Server,
} from '@strapi/tests-shared';
import { describeEE } from '@strapi/tests-shared/vitest';

// The edition contract in the cli suite: same module and helpers as the api suite.
const worker = Number(process.env.VITEST_POOL_ID ?? 1);

let server: Server;

beforeAll(async () => {
  const app = await generateApp({ name: `cli-edition-${worker}` });
  // startServer runs on the run's database (TESTS_DATABASE): give it an empty one.
  await resetDatabase(app, databaseFromEnv());
  server = await startServer(app, { port: appPort('cli', worker - 1) });
});

afterAll(async () => {
  await stopAllServers();
});

test('the app runs in the edition of the run', async () => {
  expect((await getInstanceFeatures(server)).edition).toBe(editionFromEnv());
});

describeEE('EE-only block', () => {
  test('runs only in EE runs', () => {
    expect(server.edition).toBe('ee');
  });
});
