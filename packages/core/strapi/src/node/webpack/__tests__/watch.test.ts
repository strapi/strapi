import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import Koa from 'koa';
import webpackDevMiddleware from 'webpack-dev-middleware';
import { webpack } from 'webpack';

const ENTRY_MARKER = 'webpack-dev-middleware-koa';

type WebpackKoaMiddleware = ReturnType<typeof webpackDevMiddleware.koaWrapper> & {
  devMiddleware: ReturnType<typeof webpackDevMiddleware>;
};

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

const listen = (app: Koa) =>
  new Promise<{ server: http.Server; port: number }>((resolve) => {
    const server = http.createServer(app.callback());
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      resolve({ server, port });
    });
  });

describe('webpack dev middleware', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-wdm-'));
  let server: http.Server;
  let devMiddleware: WebpackKoaMiddleware['devMiddleware'];
  let compiler: ReturnType<typeof webpack>;

  beforeAll(async () => {
    fs.writeFileSync(
      path.join(directory, 'index.js'),
      `console.log(${JSON.stringify(ENTRY_MARKER)});\n`
    );

    compiler = webpack({
      mode: 'development',
      entry: path.join(directory, 'index.js'),
      output: {
        path: path.join(directory, 'dist'),
        filename: 'main.js',
        publicPath: '/admin/',
      },
      infrastructureLogging: { level: 'none' },
      stats: 'none',
    });

    const koaDevMiddleware = webpackDevMiddleware.koaWrapper(compiler) as WebpackKoaMiddleware;
    devMiddleware = koaDevMiddleware.devMiddleware;

    const app = new Koa();
    app.use(async (ctx, next) => {
      await new Promise<void>((resolve) => {
        devMiddleware.waitUntilValid(() => {
          resolve();
        });
      });
      await koaDevMiddleware(ctx, next);
    });
    app.use(async (ctx) => {
      if (ctx.body == null && ctx.status === 404) {
        ctx.body = 'spa-fallback';
      }
    });

    ({ server } = await listen(app));
  }, 30000);

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      devMiddleware.close((error?: Error | null) => {
        if (error) {
          reject(error);
          return;
        }
        compiler.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }
          server.closeAllConnections();
          server.close(() => resolve());
        });
      });
    });
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('serves a compiled asset', async () => {
    const { port } = server.address() as { port: number };
    const response = await request(port, 'GET', '/admin/main.js');

    expect(response.status).toBe(200);
    expect(response.body).toContain(ENTRY_MARKER);
  });

  it('keeps status 200 for HEAD', async () => {
    const { port } = server.address() as { port: number };
    const response = await request(port, 'HEAD', '/admin/main.js');

    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('serves a byte range', async () => {
    const { port } = server.address() as { port: number };
    const response = await request(port, 'GET', '/admin/main.js', { Range: 'bytes=0-3' });

    expect(response.status).toBe(206);
    expect(response.body).toHaveLength(4);
  });

  it('falls through when the asset is not in the compilation', async () => {
    const { port } = server.address() as { port: number };
    const response = await request(port, 'GET', '/admin/missing.js');

    expect(response.status).toBe(200);
    expect(response.body).toBe('spa-fallback');
  });
});
