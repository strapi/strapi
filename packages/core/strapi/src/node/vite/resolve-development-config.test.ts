import http from 'node:http';

import { getCodemirrorAliases, getResolvableCodemirrorPackages } from '../core/codemirror-packages';
import { resolveDevelopmentConfig } from './config';
import type { BuildContext } from '../create-build-context';

jest.mock('browserslist-to-esbuild', () => ({
  __esModule: true,
  default: jest.fn(() => ['chrome100']),
}));

jest.mock('@vitejs/plugin-react-swc', () => ({
  __esModule: true,
  default: jest.fn(() => ({ name: 'vite:react-swc' })),
}));

jest.mock('../core/admin-vite-optimize-exclude', () => ({
  collectAdminOptimizeDepsExclude: jest.fn().mockResolvedValue([]),
}));

jest.mock('../core/linked-packages', () => ({
  isDesignSystemLinked: jest.fn().mockReturnValue(false),
}));

jest.mock('../core/monorepo', () => ({
  loadStrapiMonorepo: jest.fn().mockResolvedValue(null),
}));

const REQUIRED_CODEMIRROR_SINGLETONS = ['@codemirror/state', '@codemirror/view'] as const;

const buildCtx = (httpServer: http.Server): BuildContext =>
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
    const config = await resolveDevelopmentConfig(buildCtx(mockHttpServer));

    expect(config.server?.allowedHosts).toBe(true);
    expect(config.server?.hmr).toMatchObject({
      overlay: false,
      server: mockHttpServer,
    });
    expect((config.server?.hmr as { clientPort?: number }).clientPort).toBeUndefined();

    // CJS-only deps imported by @strapi/admin must stay pre-bundled in dev (#26944, #26964, #27014).
    expect(config.optimizeDeps?.include).toEqual(
      expect.arrayContaining(['invariant', 'lodash', 'prismjs'])
    );

    // Same modules need explicit aliases so pnpm can resolve optimizeDeps.include (#27014).
    const alias = config.resolve?.alias as Record<string, string> | undefined;
    expect(alias?.invariant).toEqual(expect.any(String));
    expect(alias?.prismjs).toEqual(expect.any(String));
    expect(alias?.lodash).toEqual(expect.any(String));

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });

  it('pre-bundles prismjs language plugins for all apps (#26964)', async () => {
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
    const include = config.optimizeDeps?.include ?? [];

    expect(include).toEqual(expect.arrayContaining(['prismjs', 'prismjs/components/*.js']));

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });
});
