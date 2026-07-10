import http from 'node:http';

import { collectAdminOptimizeDepsExclude } from '../core/admin-vite-optimize-exclude';
import { resolveDevelopmentConfig, resolveProductionConfig } from './config';
import type { BuildContext } from '../create-build-context';

jest.mock('browserslist-to-esbuild', () => ({
  __esModule: true,
  default: jest.fn(() => ['chrome100']),
}));

jest.mock('../core/admin-vite-optimize-exclude', () => ({
  ...jest.requireActual('../core/admin-vite-optimize-exclude'),
  collectAdminOptimizeDepsExclude: jest.fn(async () => ['strapi-design-extended']),
}));

const collectAdminOptimizeDepsExcludeMock = collectAdminOptimizeDepsExclude as jest.MockedFunction<
  typeof collectAdminOptimizeDepsExclude
>;

const createCtx = (): BuildContext => {
  const mockHttpServer = http.createServer();

  return {
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
      minify: true,
      sourcemaps: false,
    },
    plugins: [],
    tsconfig: undefined,
    customisations: undefined,
    features: undefined,
  } as unknown as BuildContext;
};

describe('Vite optimizeDeps exclude collection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('collects plugin UI excludes only for development config', async () => {
    const ctx = createCtx();

    const devConfig = await resolveDevelopmentConfig(ctx);
    const prodConfig = await resolveProductionConfig(ctx);

    expect(collectAdminOptimizeDepsExcludeMock).toHaveBeenCalledTimes(1);
    expect(collectAdminOptimizeDepsExcludeMock).toHaveBeenCalledWith(ctx.cwd, ctx.plugins);
    expect(devConfig.optimizeDeps?.exclude).toEqual(['strapi-design-extended']);
    expect(prodConfig.optimizeDeps?.exclude).toBeUndefined();
  });
});
