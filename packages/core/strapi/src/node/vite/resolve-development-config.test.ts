import http from 'node:http';

import { resolveDevelopmentConfig } from './config';
import type { BuildContext } from '../create-build-context';

jest.mock('browserslist-to-esbuild', () => ({
  __esModule: true,
  default: jest.fn(() => ['chrome100']),
}));

jest.mock('@vitejs/plugin-react-swc', () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

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
      // HMR must bind to Strapi's own http.Server so websockets reuse the app port behind a proxy.
      // Mock that real source instead of injecting the server via options, so the test guards the
      // strapi.server.httpServer -> config wiring that actually fixes #23491.
      strapi: { internal_config: {}, server: { httpServer: mockHttpServer } },
      bundler: 'vite' as const,
      options: {
        open: false,
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
