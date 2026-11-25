import path from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import {
  runInServer,
  scaffoldConfig,
  scaffoldContentType,
  scaffoldServerScript,
  stopAllServers,
} from '@strapi/tests-shared';

import {
  createContentAPIClient,
  setupApp,
  SUPER_ADMIN,
  type Client,
  type TestApp,
} from '../../helpers';

interface Captured {
  name: string;
  stack: string;
}

describe('Async stack traces on the query path', () => {
  let ctx: TestApp;
  let rq: Client;

  const run = <T = unknown>(action: string, args?: Record<string, unknown>) =>
    runInServer<T>(ctx.server, 'async-stack-traces', action, args);

  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-async-stack-traces',
      scaffold(app) {
        scaffoldContentType(app, {
          displayName: 'stack-article',
          singularName: 'stack-article',
          pluralName: 'stack-articles',
          attributes: {
            title: { type: 'string' },
          },
        });
        // Read when Strapi creates its database, before any plugin's register
        scaffoldConfig(app, 'database', { connection: { acquireConnectionTimeout: 1000 } });
        scaffoldServerScript(app, path.join(__dirname, 'server/async-stack-traces.js'));
      },
      seed: { adminUsers: [SUPER_ADMIN], apiTokens: [{ name: 'full', type: 'full-access' }] },
    });

    await run('installMiddleware');

    rq = createContentAPIClient(ctx.server, { token: ctx.seeded.apiTokens[0].accessKey });
  });

  afterAll(stopAllServers);

  afterEach(async () => {
    await run('saturateOnFindMany', { enabled: false });
  });

  test('uses the acquire timeout configured for this suite', async () => {
    expect(await run('acquireConnectionTimeout')).toBe(1000);
  });

  test('a REST request that times out starting its transaction reports the controller and the document service', async () => {
    await run('saturateOnFindMany', { enabled: true });

    const res = await rq.get('/stack-articles');
    const captured = await run<Captured | null>('captured');

    expect(res.status).toBe(500);
    expect(captured?.name).toBe('KnexTimeoutError');
    expect(captured?.stack).toMatch(/services[\\/]document-service[\\/]/);
    expect(captured?.stack).toMatch(/middlewares[\\/]middleware-manager/);
    expect(captured?.stack).toMatch(/document-service[\\/]common/);
    expect(captured?.stack).toMatch(/core-api[\\/]service[\\/]collection-type/);
    expect(captured?.stack).toMatch(/core-api[\\/]controller[\\/]collection-type/);
  });

  test('a direct query that times out reports the entity repository and its caller', async () => {
    const error = await run<Captured>('directQueryTimeout');

    expect(error.name).toBe('KnexTimeoutError');
    expect(error.stack).toMatch(/entity-manager[\\/]entity-repository/);
    expect(error.stack).toContain('queryFromTestCode');
  });
});
