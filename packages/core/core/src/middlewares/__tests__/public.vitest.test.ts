import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Koa from 'koa';
import Router from '@koa/router';
import request from 'supertest';
import type { Core } from '@strapi/types';

import { publicStatic } from '../public';
import createEndpointComposer from '../../services/server/compose-endpoint';
import { installRoutePathTranslation } from '../../services/server/route-path';

describe('public static middleware', () => {
  let publicDir: string;
  let server: ReturnType<Koa['callback']>;
  let lastParams: Record<string | number, unknown> | undefined;

  beforeAll(async () => {
    publicDir = await mkdtemp(join(tmpdir(), 'strapi-public-'));
    await writeFile(join(publicDir, 'robots.txt'), 'robots');
    await mkdir(join(publicDir, 'css'));
    await writeFile(join(publicDir, 'css', 'app.txt'), 'css');
    await mkdir(join(publicDir, 'uploads'));
    await writeFile(join(publicDir, 'uploads', 'file.txt'), 'upload');

    const router = new Router();
    const strapi = {
      dirs: { static: { public: publicDir } },
      config: { get: () => '/admin' },
      log: { warn: vi.fn() },
      get(name: string) {
        if (name === 'auth') {
          return { authenticate: (_ctx: unknown, next: () => unknown) => next(), verify() {} };
        }
        return { resolve: () => [] };
      },
      server: {
        routes(routes: Core.Route[]) {
          routes.forEach((route) => composeEndpoint({ ...route, info: {} }, { router }));
        },
      },
    } as unknown as Core.Strapi;
    installRoutePathTranslation(router, strapi);
    const composeEndpoint = createEndpointComposer(strapi);

    publicStatic({}, { strapi });

    const app = new Koa();
    app.use(router.routes());
    // The static server is deferred, so it runs this before looking for the file.
    app.use((ctx, next) => {
      lastParams = { ...(ctx as unknown as { params: Record<string, unknown> }).params };
      return next();
    });
    server = app.callback();
  });

  afterAll(async () => {
    await rm(publicDir, { recursive: true, force: true });
  });

  it('serves files from the public folder', async () => {
    await request(server).get('/robots.txt').expect(200, 'robots');
  });

  it('serves nested files from the public folder', async () => {
    await request(server).get('/css/app.txt').expect(200, 'css');
  });

  it('exposes the requested path as ctx.params[0], as before', async () => {
    await request(server).get('/missing/file.txt').expect(404);

    expect(lastParams).toEqual({ 0: 'missing/file.txt', splat: 'missing/file.txt' });
  });

  it('leaves /uploads/ to the upload middleware', async () => {
    await request(server).get('/uploads/file.txt').expect(404);
    await request(server).get('/UPLOADS/file.txt').expect(404);
  });

  it('redirects the root to the admin panel', async () => {
    await request(server).get('/').expect(302).expect('Location', '/admin');
  });
});
