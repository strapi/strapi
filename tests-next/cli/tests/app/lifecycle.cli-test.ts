import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { appPort, generateApp, startServer, type Server } from '@strapi/tests-shared';

// Each Vitest worker gets its own app, port and DB (VITEST_POOL_ID starts at 1).
const worker = Number(process.env.VITEST_POOL_ID ?? 1);

describe('test app lifecycle', () => {
  let server: Server;

  beforeAll(async () => {
    const app = await generateApp({ name: `cli-${worker}` });
    server = await startServer(app, { port: appPort('cli', worker - 1) });
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('starts an empty app and serves the API', async () => {
    const health = await fetch(`${server.url}/_health`);
    expect(health.status).toBe(204);

    // Empty app: no content types, so the users-permissions routes are the only content API.
    const roles = await fetch(`${server.url}/api/users-permissions/roles`);
    expect(roles.status).toBe(403);
  });
});
