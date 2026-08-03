import http from 'node:http';

import { ADMIN_VITE_SINGLETON_MODULES } from '../core/admin-vite-alias-modules';
import { ADMIN_VITE_MONOREPO_EXAMPLE_OPTIMIZE_INCLUDE } from '../core/admin-vite-monorepo-optimize-include';
import { collectAdminOptimizeDepsExclude } from '../core/admin-vite-optimize-exclude';
import type { PluginMeta } from '../core/plugins';
import { resolveDevelopmentConfig, resolveProductionConfig } from './config';
import type { BuildContext } from '../create-build-context';

jest.mock('browserslist-to-esbuild', () => ({
  __esModule: true,
  default: jest.fn(() => ['chrome100']),
}));

jest.mock('../core/admin-vite-optimize-exclude', () => {
  const actual = jest.requireActual('../core/admin-vite-optimize-exclude');

  return {
    ...actual,
    collectAdminOptimizeDepsExclude: jest.fn(),
  };
});

const collectAdminOptimizeDepsExcludeMock = collectAdminOptimizeDepsExclude as jest.MockedFunction<
  typeof collectAdminOptimizeDepsExclude
>;

const colorPickerPlugin: PluginMeta = {
  name: 'color-picker',
  importName: 'colorPicker',
  type: 'module',
  modulePath: '@strapi/plugin-color-picker/strapi-admin',
};

const createViteCtx = ({
  uuid,
  plugins = [],
  options = { open: false },
}: {
  uuid?: string;
  plugins?: PluginMeta[];
  options?: Record<string, unknown>;
}): { ctx: BuildContext; httpServer: http.Server } => {
  const httpServer = http.createServer();

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
    strapi: {
      internal_config: uuid ? { uuid } : {},
      server: { httpServer },
    },
    bundler: 'vite' as const,
    options,
    plugins,
    tsconfig: undefined,
    customisations: undefined,
    features: undefined,
  } as unknown as BuildContext;

  return { ctx, httpServer };
};

const closeHttpServer = (httpServer: http.Server) =>
  new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

describe('Vite admin configuration', () => {
  beforeEach(() => {
    collectAdminOptimizeDepsExcludeMock.mockReset();
    collectAdminOptimizeDepsExcludeMock.mockResolvedValue([]);
  });

  it('does not copy public files into the admin build output', async () => {
    const { ctx, httpServer } = createViteCtx({
      options: { minify: true, sourcemaps: false },
    });

    const config = await resolveProductionConfig(ctx);

    expect(config.publicDir).toBe(false);
    await closeHttpServer(httpServer);
  });

  it('allows proxied hosts and pins HMR to the Strapi HTTP server without a separate clientPort (#23491)', async () => {
    const { ctx, httpServer } = createViteCtx({});

    const config = await resolveDevelopmentConfig(ctx);

    expect(config.server?.allowedHosts).toBe(true);
    expect(config.server?.hmr).toMatchObject({
      overlay: false,
      server: httpServer,
    });
    expect((config.server?.hmr as { clientPort?: number } | undefined)?.clientPort).toBeUndefined();

    // CJS-only deps imported by @strapi/admin must stay pre-bundled in dev (#26944, #26964, #27014).
    expect(config.optimizeDeps?.include).toEqual(
      expect.arrayContaining(['invariant', 'lodash', 'prismjs'])
    );

    // Same modules need explicit aliases so pnpm can resolve optimizeDeps.include (#27014).
    const alias = config.resolve?.alias as Record<string, string> | undefined;
    expect(alias?.invariant).toEqual(expect.any(String));
    expect(alias?.prismjs).toEqual(expect.any(String));
    expect(alias?.lodash).toEqual(expect.any(String));

    // CodeMirror must be pre-bundled and aliased for every admin build so the JSON custom
    // field keeps a single instance (JSONInput instanceof checks)
    expect(config.optimizeDeps?.include).toEqual(
      expect.arrayContaining([...ADMIN_VITE_SINGLETON_MODULES])
    );
    for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
      expect(alias?.[mod]).toEqual(expect.any(String));
    }

    await closeHttpServer(httpServer);
  });

  it('pre-bundles prismjs core but not language components (#26964 / blank-admin)', async () => {
    const { ctx, httpServer } = createViteCtx({});

    const config = await resolveDevelopmentConfig(ctx);
    const include = config.optimizeDeps?.include ?? [];

    // Core stays prebundled (#26964). Language glob must stay out — #26978+#27014 reverse-order
    // prebundle blanks the admin with TypeError setting 'comment'.
    expect(include).toEqual(expect.arrayContaining(['prismjs']));
    expect(include).not.toContain('prismjs/components/*.js');

    await closeHttpServer(httpServer);
  });

  it('drops auto-exclude entries that collide with getstarted optimizeDeps.include (#27202)', async () => {
    collectAdminOptimizeDepsExcludeMock.mockResolvedValue([
      'react-colorful',
      'strapi-design-extended',
    ]);

    const { ctx, httpServer } = createViteCtx({
      uuid: 'getstarted',
      plugins: [colorPickerPlugin],
    });

    const config = await resolveDevelopmentConfig(ctx);
    const include = config.optimizeDeps?.include ?? [];
    const exclude = config.optimizeDeps?.exclude ?? [];

    expect(include).toEqual(
      expect.arrayContaining([...ADMIN_VITE_MONOREPO_EXAMPLE_OPTIMIZE_INCLUDE])
    );
    expect(include).toContain('react-colorful');
    expect(exclude).toEqual(['strapi-design-extended']);
    expect(exclude.filter((name) => include.includes(name))).toEqual([]);

    await closeHttpServer(httpServer);
  });

  it('keeps auto-exclude entries that are not on the consumer include list', async () => {
    collectAdminOptimizeDepsExcludeMock.mockResolvedValue([
      'react-colorful',
      'strapi-design-extended',
    ]);

    const { ctx, httpServer } = createViteCtx({
      plugins: [colorPickerPlugin],
    });

    const config = await resolveDevelopmentConfig(ctx);
    const include = config.optimizeDeps?.include ?? [];
    const exclude = config.optimizeDeps?.exclude ?? [];

    expect(include).not.toContain('react-colorful');
    expect(exclude).toEqual(['react-colorful', 'strapi-design-extended']);
    expect(exclude.filter((name) => include.includes(name))).toEqual([]);

    await closeHttpServer(httpServer);
  });
});
