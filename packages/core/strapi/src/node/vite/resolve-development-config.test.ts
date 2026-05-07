import http from 'node:http';

import { resolveDevelopmentConfig } from './config';
import type { BuildContext } from '../create-build-context';

describe('resolveDevelopmentConfig (Vite admin dev)', () => {
  it('allows proxied hosts and pins HMR to the Strapi HTTP server without a separate clientPort (#23491)', async () => {
    const mockHttpServer = http.createServer();
    const ctx = {
      cwd: process.cwd(),
      target: ['last 3 major versions'],
      basePath: '/admin',
      adminPath: '/admin',
      distDir: 'dist/build',
      appDir: process.cwd(),
      entry: '.strapi/client/app.js',
      distPath: `${process.cwd()}/dist/build`,
      env: {},
      runtimeDir: `${process.cwd()}/.strapi/client`,
      logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
      strapi: { internal_config: {} },
      bundler: 'vite' as const,
      options: {
        open: false,
        hmrServer: mockHttpServer,
      },
      plugins: [],
      tsconfig: undefined,
      customisations: undefined,
      features: undefined,
    } as unknown as BuildContext;

    const config = await resolveDevelopmentConfig(ctx);

    expect(config.server?.allowedHosts).toBe(true);
    expect(config.server?.hmr).toMatchObject({
      overlay: false,
      server: mockHttpServer,
    });
    expect((config.server?.hmr as { clientPort?: number }).clientPort).toBeUndefined();

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });
});
