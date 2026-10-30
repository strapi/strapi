import { afterAll, beforeAll, describe, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Koa from 'koa';
import Router, { type RouterMiddleware } from '@koa/router';
import request from 'supertest';
import type { Core } from '@strapi/types';

import { publicStatic } from '../public';

describe('public static middleware', () => {
  let publicDir: string;
  let server: ReturnType<Koa['callback']>;

  beforeAll(async () => {
    publicDir = await mkdtemp(join(tmpdir(), 'strapi-public-'));
    await writeFile(join(publicDir, 'robots.txt'), 'robots');
    await mkdir(join(publicDir, 'uploads'));
    await writeFile(join(publicDir, 'uploads', 'file.txt'), 'upload');

    const router = new Router();
    const strapi = {
      dirs: { static: { public: publicDir } },
      config: { get: () => '/admin' },
      server: {
        routes(routes: Core.Route[]) {
          routes.forEach((route) => router.get(route.path, route.handler as RouterMiddleware));
        },
      },
    } as unknown as Core.Strapi;

    publicStatic({}, { strapi });

    const app = new Koa();
    app.use(router.routes());
    server = app.callback();
  });

  afterAll(async () => {
    await rm(publicDir, { recursive: true, force: true });
  });

  it('serves files from the public folder', async () => {
    await request(server).get('/robots.txt').expect(200, 'robots');
  });

  it('leaves /uploads/ to the upload middleware', async () => {
    await request(server).get('/uploads/file.txt').expect(404);
  });

  it('redirects the root to the admin panel', async () => {
    await request(server).get('/').expect(302).expect('Location', '/admin');
  });
});
