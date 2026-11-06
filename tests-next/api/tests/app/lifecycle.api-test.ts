import fs from 'node:fs';
import path from 'node:path';

import {
  appPort,
  generateApp,
  startServer,
  stopAllServers,
  type App,
  type Server,
} from '@strapi/tests-shared';

// Each Jest worker gets its own app, port and DB (JEST_WORKER_ID starts at 1).
const worker = Number(process.env.JEST_WORKER_ID ?? 1);

jest.setTimeout(180_000);

describe('test app lifecycle', () => {
  let app: App;
  let server: Server;

  beforeAll(async () => {
    app = await generateApp({ name: `api-${worker}` });
    server = await startServer(app, { port: appPort('api', worker - 1) });
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
    // startServer already waited for /_health. The users-permissions bootstrap seeds the public
    // role without any permission, so its content API answers 403.
    const roles = await fetch(`${server.url}/api/users-permissions/roles`);
    expect(roles.status).toBe(403);
  });
});
