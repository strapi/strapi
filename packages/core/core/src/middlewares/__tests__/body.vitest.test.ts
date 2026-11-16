import { describe, test, expect } from 'vitest';
import request from 'supertest';

import createKoaApp from '../../services/server/koa';
import { body } from '../body';

const strapi = { plugin: () => undefined } as any;

const createApp = (config: Parameters<typeof body>[0] = {}) => {
  const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });

  app.use(body(config, { strapi }));
  app.use(async (ctx) => {
    ctx.body = { files: Object.keys(ctx.request.files ?? {}), fields: ctx.request.body };
  });

  return app;
};

describe('Body middleware', () => {
  test('answers a file above formidable.maxFileSize with the limit in the error details', async () => {
    const app = createApp({ formidable: { maxFileSize: 10 } });

    const res = await request(app.callback())
      .post('/upload')
      .attach('files', Buffer.alloc(100, 1), 'big.png');

    expect(res.status).toBe(413);
    expect(res.body).toEqual({
      data: null,
      error: {
        status: 413,
        name: 'PayloadTooLargeError',
        message: 'FileTooBig',
        details: { code: 'FileTooBig', limit: 10 },
      },
    });
  });

  test('passes through a file within the limit', async () => {
    const app = createApp({ formidable: { maxFileSize: 1000 } });

    const res = await request(app.callback())
      .post('/upload')
      .attach('files', Buffer.alloc(100, 1), 'small.png');

    expect(res.status).toBe(200);
    expect(res.body.files).toEqual(['files']);
  });

  test('passes through a multipart request without files', async () => {
    const app = createApp({ formidable: { maxFileSize: 10 } });

    const res = await request(app.callback()).post('/form').field('title', 'hello');

    expect(res.status).toBe(200);
    expect(res.body.fields).toEqual({ title: 'hello' });
  });
});
