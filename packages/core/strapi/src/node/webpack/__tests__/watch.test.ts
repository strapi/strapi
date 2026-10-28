import http from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import Koa from 'koa';
import type { Configuration } from 'webpack';

import type { BuildContext } from '../../create-build-context';
import { mergeConfigWithUserConfig, resolveDevelopmentConfig } from '../config';
import { watch } from '../watch';

jest.mock('../config', () => ({
  resolveDevelopmentConfig: jest.fn(),
  mergeConfigWithUserConfig: jest.fn((config) => config),
}));

const request = (server: http.Server, url: string, options: http.RequestOptions = {}) =>
  new Promise<{ status: number | undefined; body: string; headers: http.IncomingHttpHeaders }>(
    (resolve, reject) => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing test server address');
      const req = http.request(
        { host: '127.0.0.1', port: address.port, path: url, ...options },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () =>
            resolve({
              status: res.statusCode,
              body: Buffer.concat(chunks).toString(),
              headers: res.headers,
            })
          );
        }
      );
      req.setTimeout(2000, () => req.destroy(new Error('Webpack response timed out')));
      req.on('error', reject);
      req.end();
    }
  );

// Use real Koa, webpack and middleware; only the configuration resolver is stubbed.
// No CMS instance, database, browser, or external network is needed.
describe('webpack watch Koa integration', () => {
  let directory: string;
  let server: http.Server;
  let watcher: Awaited<ReturnType<typeof watch>>;

  beforeAll(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'strapi-webpack-watch-'));
    await writeFile(path.join(directory, 'entry.js'), 'module.exports = "visible fixture";');
    const config: Configuration = {
      mode: 'development',
      devtool: false,
      stats: 'errors-only',
      entry: path.join(directory, 'entry.js'),
      // A custom publicPath without a trailing slash exercises the traversal fix.
      output: { path: path.join(directory, 'out'), filename: 'bundle.js', publicPath: '/admin' },
      infrastructureLogging: { level: 'none' },
      plugins: [
        {
          apply(compiler) {
            compiler.hooks.thisCompilation.tap('Fixture', (compilation) => {
              compilation.hooks.processAssets.tap('Fixture', () => {
                compilation.emitAsset(
                  'index.html',
                  new compiler.webpack.sources.RawSource('admin fixture')
                );
              });
            });
            compiler.hooks.afterEmit.tapAsync('Fixture', (_compilation, callback) => {
              if (!compiler.outputFileSystem) {
                callback(new Error('Missing output filesystem'));
                return;
              }
              compiler.outputFileSystem.writeFile(
                path.join(directory, 'secret.txt'),
                'SIBLING_FIXTURE',
                callback
              );
            });
          },
        },
      ],
    };
    jest.mocked(resolveDevelopmentConfig).mockResolvedValue(config);
    jest.mocked(mergeConfigWithUserConfig).mockImplementation(async (value) => value);
    const app = new Koa();
    watcher = await watch({
      adminPath: '/admin',
      logger: { debug: jest.fn() },
      strapi: {
        server: {
          app,
          routes(routes: Array<{ handler: Koa.Middleware }>) {
            routes.forEach((route) =>
              app.use((ctx, next) =>
                ctx.path.startsWith('/admin/') ? route.handler(ctx, next) : next()
              )
            );
          },
        },
      },
    } as unknown as BuildContext);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
  });

  afterAll(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    if (watcher) await watcher.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('serves assets and HEAD responses through Koa', async () => {
    const get = await request(server, '/admin/bundle.js');
    expect(get.status).toBe(200);
    expect(get.body).toContain('visible fixture');
    expect(get.headers['content-type']).toMatch(/javascript/);
    const head = await request(server, '/admin/bundle.js', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.body).toBe('');
    expect(head.headers['content-length']).toBe(get.headers['content-length']);
  });

  it('preserves the partial-content status and byte range', async () => {
    const get = await request(server, '/admin/bundle.js');
    const range = await request(server, '/admin/bundle.js', { headers: { range: 'bytes=0-9' } });
    expect(range.status).toBe(206);
    expect(range.body).toBe(get.body.slice(0, 10));
    expect(range.headers['content-range']).toMatch(/^bytes 0-9\//);
  });

  it('falls through missing routes and preserves the admin HTML fallback', async () => {
    expect((await request(server, '/missing')).status).toBe(404);
    const fallback = await request(server, '/admin/content-manager');
    expect(fallback.status).toBe(200);
    expect(fallback.body).toBe('admin fixture');
  });

  it('rejects traversal beyond a custom publicPath', async () => {
    const response = await request(server, '/admin../secret.txt');
    expect(response.status).toBe(403);
    expect(response.body).not.toContain('SIBLING_FIXTURE');
  });
});
