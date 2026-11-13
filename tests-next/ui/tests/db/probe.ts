import type { Server } from '@strapi/tests-shared';

/**
 * Writes one row: the test transfer token. `created: true` means the database didn't have it,
 * so the token is a cheap probe of whether a reset happened before the test.
 */
export const writeProbe = async (server: Server) => {
  const res = await fetch(`${server.url}/api/tests/transfer-token`, { method: 'POST' });
  return ((await res.json()) as { created: boolean }).created;
};
