import { afterAll, beforeAll, describe, expect, onTestFinished, test, vi } from 'vitest';

import {
  appPort,
  databaseFromEnv,
  databaseName,
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

describe('startServer', () => {
  test("runs on the run's database when none is given", async () => {
    await resetDatabase(app, database);
    const server = await startServer(app, { port });
    onTestFinished(() => server.stop());
    expect(server.database).toEqual(database);
    // The app answers, so it really runs on that database.
    expect(await writeProbe(server)).toBe(true);
  });
});

describe('database names', () => {
  test('differ between checkouts and fit the name length limit', () => {
    const name = (dir: string, appName = 'api-1') =>
      databaseName({ name: appName, dir, dbFile: `${dir}/.tmp/data.db` });

    expect(name('/work/a/test-apps/next/api-1')).toMatch(/^tests_api_1_[0-9a-f]{10}$/);
    expect(name('/work/a/test-apps/next/api-1')).not.toBe(name('/work/b/test-apps/next/api-1'));
    expect(name('/work/a', 'a'.repeat(100)).length).toBeLessThanOrEqual(63);
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

  /** Changes when the Strapi worker restarts (the spawned process keeps its pid). */
  const bootId = async () => {
    const res = await fetch(`${server.url}/api/tests/boot`);
    return ((await res.json()) as { bootId: string }).bootId;
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
    const before = await bootId();

    await timed('restore sql', () => restoreDatabase(server));

    expect(await bootId()).toBe(before);
    expect(await hasAdmin()).toBe(false);
    expect(await writeProbe(server)).toBe(false);
  });

  test('a reset drops the snapshot', async () => {
    await server.stop();

    await resetDatabase(app, database);
    server = await startServer(app, { port, database });

    // A restore must not bring back the previous instance's data.
    await expect(restoreDatabase(server)).rejects.toThrow('No snapshot');
  });
});

describe.skipIf(database.client === 'sqlite')(`snapshots on ${database.client}`, () => {
  test('are refused: the database is reset before boot instead', async () => {
    await resetDatabase(app, database);
    const server = await startServer(app, { port, database });
    await expect(snapshotDatabase(server)).rejects.toThrow('Snapshots are SQLite only');
    await server.stop();
  });

  test("another checkout's reset leaves this app's database alone", async () => {
    await resetDatabase(app, database);
    const server = await startServer(app, { port, database });
    expect(await writeProbe(server)).toBe(true);

    // The same app in another worktree, on the same database server.
    const otherCheckout: App = { ...app, dir: `${app.dir}-other-checkout` };
    await resetDatabase(otherCheckout, database);

    expect(await writeProbe(server)).toBe(false);
    await server.stop();
  });
});
