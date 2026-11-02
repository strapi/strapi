import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import Koa from 'koa';
import type { Compiler, Configuration } from 'webpack';

import { resolveDevelopmentConfig } from '../config';
import { watch, type WebpackWatcher } from '../watch';

import type { BuildContext } from '../../create-build-context';

jest.mock('../config', () => ({
  resolveDevelopmentConfig: jest.fn(),
  mergeConfigWithUserConfig: jest.fn(async (config: unknown) => config),
}));

const ENTRY_MARKER = 'webpack-dev-middleware-koa';
const INDEX_MARKER = 'admin-index-html';
const SECRET_MARKER = 'outside-the-webpack-output';

const request = (
  port: number,
  method: string,
  requestPath: string,
  headers?: http.OutgoingHttpHeaders
) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: requestPath, method, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });

const emitIndexHtml = {
  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap('EmitIndexHtml', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'EmitIndexHtml',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          compilation.emitAsset(
            'index.html',
            new compiler.webpack.sources.RawSource(`<html>${INDEX_MARKER}</html>`)
          );
        }
      );
    });
  },
};

describe('webpack watch', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-wdm-'));
  const app = new Koa();
  let server: http.Server;
  let port: number;
  let watcher: WebpackWatcher;

  beforeAll(async () => {
    fs.writeFileSync(
      path.join(directory, 'index.js'),
      `console.log(${JSON.stringify(ENTRY_MARKER)});\n`
    );
    fs.writeFileSync(path.join(directory, 'secret.txt'), SECRET_MARKER);

    const config: Configuration = {
      mode: 'development',
      entry: path.join(directory, 'index.js'),
      output: {
        path: path.join(directory, 'dist'),
        filename: 'main.js',
        publicPath: '/admin/',
      },
      plugins: [emitIndexHtml],
      infrastructureLogging: { level: 'none' },
      stats: 'none',
    };
    jest.mocked(resolveDevelopmentConfig).mockResolvedValue(config);

    const ctx = {
      adminPath: '/admin',
      logger: { debug: jest.fn() },
      strapi: {
        server: {
          app,
          routes(routes: Array<{ path: string; handler: Koa.Middleware }>) {
            routes.forEach((route) => {
              const prefix = route.path.replace('/:path*', '');
              app.use((context, next) =>
                context.path.startsWith(prefix) ? route.handler(context, next) : next()
              );
            });
          },
        },
      },
    } as unknown as BuildContext;

    watcher = await watch(ctx);

    server = http.createServer(app.callback());
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    ({ port } = server.address() as { port: number });
  }, 30000);

  afterAll(async () => {
    await watcher.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('serves a compiled asset', async () => {
    const response = await request(port, 'GET', '/admin/main.js');

    expect(response.status).toBe(200);
    expect(response.body).toContain(ENTRY_MARKER);
  });

  it('keeps status 200 for HEAD', async () => {
    const response = await request(port, 'HEAD', '/admin/main.js');

    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('serves a byte range', async () => {
    const response = await request(port, 'GET', '/admin/main.js', { Range: 'bytes=0-3' });

    expect(response.status).toBe(206);
    expect(response.body).toHaveLength(4);
  });

  it('serves the admin index for routes that are not in the compilation', async () => {
    const response = await request(port, 'GET', '/admin/content-manager/collection-types');

    expect(response.status).toBe(200);
    expect(response.body).toContain(INDEX_MARKER);
  });

  it.each([
    '/admin/..%2fsecret.txt',
    '/admin/%2e%2e/secret.txt',
    '/admin/%2e%2e%2fsecret.txt',
    '/admin/..%5csecret.txt',
  ])('does not serve files outside the webpack output for %s', async (requestPath) => {
    const response = await request(port, 'GET', requestPath);

    expect(response.status).toBe(403);
    expect(response.body).not.toContain(SECRET_MARKER);
    expect(response.body).not.toContain(INDEX_MARKER);
  });
});
