import { afterAll, beforeAll, describe, expect, onTestFinished, test, vi } from 'vitest';

import {
  appPort,
  databaseFromEnv,
  generateApp,
  resetDatabase,
  restoreDatabase,
  snapshotDatabase,
  startServer,
  stopAllServers,
  type App,
  type Server,
} from '@strapi/tests-shared';

const worker = Number(process.env.VITEST_POOL_ID ?? 1);
const port = appPort('api', worker - 1);
const database = databaseFromEnv();

/**
 * Writes one row: the test transfer token. `created: true` means the database didn't have it,
 * so the token is a cheap probe of whether a reset happened.
 */
const writeProbe = async (server: Server) => {
  const res = await fetch(`${server.url}/api/tests/transfer-token`, { method: 'POST' });
  return ((await res.json()) as { created: boolean }).created;
};

const timed = async <T>(label: string, fn: () => Promise<T>) => {
  const start = performance.now();
  const result = await fn();
  console.log(
    `[reset times] ${database.client} ${label}: ${(performance.now() - start).toFixed(0)} ms`
  );
  return result;
};

let app: App;

beforeAll(async () => {
  app = await generateApp({ name: `api-db-${worker}` });
});

afterAll(async () => {
  await stopAllServers();
});

describe(`per-file instance (${database.client})`, () => {
  test('a new instance starts on an empty database', async () => {
    // From the runner's shell, it would point a Postgres app at another database (or here, at
    // nothing): the app must only get the database env of `database`.
    vi.stubEnv('DATABASE_URL', 'postgres://nobody:nothing@127.0.0.1:1/elsewhere');
    onTestFinished(() => {
      vi.unstubAllEnvs();
    });

    await resetDatabase(app, database);
    let server = await startServer(app, { port, database });
    expect(await writeProbe(server)).toBe(true);
    expect(await writeProbe(server)).toBe(false);
    await server.stop();

    await timed('reset before boot', () => resetDatabase(app, database));
    server = await timed('boot on the empty database', () => startServer(app, { port, database }));
    expect(await writeProbe(server)).toBe(true);
    await server.stop();
  });
});

describe.skipIf(database.client !== 'sqlite')('SQLite snapshot and restore', () => {
  let server: Server;

  /** A row written after the snapshot: the first admin user, which a restore must remove. */
  const registerAdmin = async () => {
    const res = await fetch(`${server.url}/admin/register-admin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.io',
        firstname: 'Admin',
        lastname: 'User',
        password: 'Testing123!',
      }),
    });
    expect(res.status, await res.text()).toBe(200);
  };

  const hasAdmin = async () => {
    const res = await fetch(`${server.url}/admin/init`);
    return ((await res.json()) as { data: { hasAdmin: boolean } }).data.hasAdmin;
  };

  beforeAll(async () => {
    await resetDatabase(app, database);
    server = await startServer(app, { port, database });
    // In the snapshot: a restore must bring it back, not only remove what came after.
    expect(await writeProbe(server)).toBe(true);
    await timed('snapshot', () => snapshotDatabase(server));
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('sql restore brings back the snapshot without a restart', async () => {
    await registerAdmin();
    const pid = server.pid;

    await timed('restore sql', () => restoreDatabase(server));

    expect(server.pid).toBe(pid);
    expect(await hasAdmin()).toBe(false);
    expect(await writeProbe(server)).toBe(false);
  });

  test('reload restore brings back the snapshot through a worker restart', async () => {
    await registerAdmin();

    await timed('restore reload', () => restoreDatabase(server, { mode: 'reload' }));

    expect(await hasAdmin()).toBe(false);
    expect(await writeProbe(server)).toBe(false);
  });
});

describe.skipIf(database.client === 'sqlite')(`snapshots on ${database.client}`, () => {
  test('are refused: the database is reset before boot instead', async () => {
    await resetDatabase(app, database);
    const server = await startServer(app, { port, database });
    await expect(snapshotDatabase(server)).rejects.toThrow('Snapshots are SQLite only');
    await server.stop();
  });
});
