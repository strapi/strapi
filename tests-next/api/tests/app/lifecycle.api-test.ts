import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  appPort,
  databaseFromEnv,
  generateApp,
  resetDatabase,
  startServer,
  stopAllServers,
  type App,
  type Server,
} from '@strapi/tests-shared';

// Each Vitest worker gets its own app, port and DB (VITEST_POOL_ID starts at 1).
const worker = Number(process.env.VITEST_POOL_ID ?? 1);

describe('test app lifecycle', () => {
  let app: App;
  let server: Server;

  beforeAll(async () => {
    // One instance per file, on an empty database (TESTS_DATABASE, SQLite by default).
    const database = databaseFromEnv();
    app = await generateApp({ name: `api-${worker}` });
    await resetDatabase(app, database);
    server = await startServer(app, { port: appPort('api', worker - 1), database });
  });

  afterAll(async () => {
    // Also stops a server whose start outlived a timed out beforeAll.
    await stopAllServers();
  });

  test('generates an app without content types', () => {
    // Ignore dotfiles such as the .gitkeep create-strapi-app leaves.
    expect(
      fs.readdirSync(path.join(app.dir, 'src', 'api')).filter((name) => !name.startsWith('.'))
    ).toEqual([]);
  });

  test('starts the app and serves the content API', async () => {
    // startServer already waited for /_health. The users-permissions bootstrap gives the public
    // role its auth actions only, not role.find, so the roles route answers 403.
    const roles = await fetch(`${server.url}/api/users-permissions/roles`);
    expect(roles.status).toBe(403);
  });
});
