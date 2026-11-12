import type { Server } from '../app/server';

export type RestoreMode = 'sql' | 'reload';

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const call = async (server: Server, method: string, route: string, body?: unknown) => {
  const res = await fetch(`${server.url}/api/tests${route}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${method} /api/tests${route} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
};

/**
 * Snapshot the live SQLite database of a server (`VACUUM INTO`, about 15 ms). Take it once per
 * run, after the seed and the role logins, so the restored admin sessions keep tokens valid.
 */
export const snapshotDatabase = async (server: Server) => {
  await call(server, 'POST', '/db/snapshot');
};

/**
 * Restore the snapshot (SQLite only):
 * - `sql` (default, about 20 ms): copies every table back without restarting Strapi.
 * - `reload` (about 2 s): restarts the Strapi worker on the snapshot file. Use it after a test
 *   changed the schema (content-type-builder), since `sql` needs the same tables.
 */
export const restoreDatabase = async (
  server: Server,
  { mode = 'sql', timeout = 60_000 }: { mode?: RestoreMode; timeout?: number } = {}
) => {
  if (mode === 'sql') {
    await call(server, 'POST', '/db/restore', { mode });
    return;
  }

  const { bootId } = await call(server, 'POST', '/db/restore', { mode });
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${server.url}/api/tests/boot`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (res.ok && ((await res.json()) as { bootId: string }).bootId !== bootId) {
        return;
      }
    } catch {
      // the worker is restarting
    }
    await sleep(50);
  }
  throw new Error(`Strapi (${server.app.name}) did not come back after a reload restore.`);
};
