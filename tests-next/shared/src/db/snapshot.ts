import type { Server } from '../app/server';

/** Calls a test plugin route (`/api/tests…`) and fails on any non-2xx status, with its body. */
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
 * Restore the snapshot (SQLite only, about 20 ms): copies every table back without restarting
 * Strapi. It needs the schema of the snapshot: specs that change the schema (Content-Type
 * Builder) aren't supported yet, and will come with the first such spec.
 *
 * It only resets the database. Strapi keeps running, so what lives outside it, or what Strapi
 * read from it once, stays as the previous spec left it. A spec that changes one of these resets
 * it itself:
 * - the admin login rate limit (`admin.rateLimit.enabled`, set with POST /api/tests/rate-limit);
 * - the calls the fake AI provider received (DELETE /api/tests/ai/calls);
 * - files in `public/uploads` (the upload rows go back, the files stay);
 * - webhooks, loaded into memory once at bootstrap;
 * - the cron jobs of scheduled releases, synced at bootstrap;
 * - the custom-order cache, kept up to 10 s.
 */
export const restoreDatabase = async (server: Server) => {
  await call(server, 'POST', '/db/restore');
};

/**
 * Writes the probe row (POST /api/tests/db/probe). `true` means the database didn't have it, so
 * a reset happened since the last write. Fails when the route answers an error.
 */
export const writeProbe = async (server: Server) => {
  const body = await call(server, 'POST', '/db/probe');
  if (typeof body.created !== 'boolean') {
    throw new Error(`POST /api/tests/db/probe returned no "created" flag: ${JSON.stringify(body)}`);
  }
  return body.created;
};
