import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';

import { defineApp, defineConfig, loadStrapi } from '../index';
import * as is from '../attributes';

const lazyEmail = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-missing-require
  const mod = require('@strapi/email/strapi-server');
  const resolved = mod && mod.__esModule ? mod.default : (mod?.default ?? mod);
  return typeof resolved === 'function'
    ? // eslint-disable-next-line @typescript-eslint/no-var-requires
      resolved({ env: require('@strapi/utils').env })
    : resolved;
};

const minimalApp = (dbFilename: string) =>
  defineApp({
    config: defineConfig({
      database: {
        connection: {
          client: 'sqlite',
          connection: { filename: dbFilename },
        },
      },
      server: { host: '127.0.0.1', port: 0, app: { keys: ['k1', 'k2'] } },
      admin: {
        apiToken: { salt: 's1' },
        auth: { secret: 's2' },
        transfer: { token: { salt: 's3' } },
        secrets: { encryptionKey: '0123456789abcdef0123456789abcdef' },
      },
      logger: { config: { level: 'warn' } },
    }),
    plugins: { email: lazyEmail() },
    contentTypes: [
      {
        singularName: 'note',
        pluralName: 'notes',
        displayName: 'Note',
        api: false,
        attributes: { body: is.text() },
      },
    ],
    routes: ({ post }) => [post('/echo', (ctx) => ({ youSent: ctx.request.body }))],
  });

describe('loadStrapi', () => {
  it('loads and mounts without calling listen', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'load-strapi-'));
    const dbFile = join(workDir, 'data.db');

    const strapi = await loadStrapi(minimalApp(dbFile), { serveAdminPanel: false });

    try {
      expect(strapi.isLoaded).toBe(true);

      const echo = await request(strapi.server.app.callback())
        .post('/api/echo')
        .send({ ping: 'pong' });

      expect(echo.status).toBe(200);
      expect(echo.body).toEqual({ youSent: { ping: 'pong' } });

      // loadStrapi must not open a listening socket — the host owns the port.
      expect(strapi.server.httpServer.listening).toBe(false);
    } finally {
      await strapi.destroy();
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
