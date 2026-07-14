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

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });

  it('wires CodeMirror singleton packages through optimizeDeps, dedupe, and alias', async () => {
    const mockHttpServer = http.createServer();
    const config = await resolveDevelopmentConfig(buildCtx(mockHttpServer));
    const codemirrorAliases = getCodemirrorAliases();
    const codemirrorResolvable = getResolvableCodemirrorPackages();
    const alias =
      typeof config.resolve?.alias === 'object' && !Array.isArray(config.resolve.alias)
        ? config.resolve.alias
        : {};

    expect(codemirrorResolvable.length).toBeGreaterThan(0);

    for (const pkg of REQUIRED_CODEMIRROR_SINGLETONS) {
      expect(codemirrorResolvable).toContain(pkg);
      expect(config.optimizeDeps?.include).toEqual(expect.arrayContaining([pkg]));
      expect(config.resolve?.dedupe).toEqual(expect.arrayContaining([pkg]));
      expect(alias).toMatchObject({
        [pkg]: codemirrorAliases[pkg],
      });
    }

    for (const pkg of codemirrorResolvable) {
      expect(config.optimizeDeps?.include).toEqual(expect.arrayContaining([pkg]));
      expect(config.resolve?.dedupe).toEqual(expect.arrayContaining([pkg]));
      expect(alias).toMatchObject({
        [pkg]: codemirrorAliases[pkg],
      });
    }

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });
});
