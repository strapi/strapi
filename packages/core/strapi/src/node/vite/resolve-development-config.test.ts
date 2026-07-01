import http from 'node:http';

import { resolveDevelopmentConfig } from './config';
import type { BuildContext } from '../create-build-context';

jest.mock('./plugins', () => ({
  buildFilesPlugin: jest.fn(() => ({})),
}));

jest.mock('browserslist-to-esbuild', () => ({
  __esModule: true,
  default: jest.fn(() => ['chrome100']),
}));

jest.mock('@vitejs/plugin-react-swc', () => ({
  __esModule: true,
  default: jest.fn(() => []),
}));

jest.mock('../core/resolve-module', () => ({
  getModulePath: jest.fn((mod: string) => `/mock/${mod}`),
}));

jest.mock('../core/linked-packages', () => ({
  isDesignSystemLinked: jest.fn(() => false),
}));

jest.mock('../core/monorepo', () => ({
  loadStrapiMonorepo: jest.fn(async () => undefined),
}));

const createCtx = (httpServer = http.createServer()) =>
  ({
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
    strapi: { internal_config: {}, server: { httpServer } },
    bundler: 'vite' as const,
    options: {
      open: false,
    },
    plugins: [],
    tsconfig: undefined,
    customisations: undefined,
    features: undefined,
  }) as unknown as BuildContext;

describe('resolveDevelopmentConfig (Vite admin dev)', () => {
  it('allows proxied hosts and pins HMR to the Strapi HTTP server without a separate clientPort (#23491)', async () => {
    const mockHttpServer = http.createServer();
    const ctx = createCtx(mockHttpServer);

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

  it('aliases path and node:path for browser bundles (#26541)', async () => {
    const mockHttpServer = http.createServer();
    const ctx = createCtx(mockHttpServer);

    const config = await resolveDevelopmentConfig(ctx);

    expect(config.resolve?.alias).toMatchObject({
      path: '/mock/path-browserify',
      'node:path': '/mock/path-browserify',
    });

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });
});
