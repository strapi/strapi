import http from 'node:http';

import { ADMIN_VITE_SINGLETON_MODULES } from '../core/admin-vite-alias-modules';
import { resolveDevelopmentConfig, resolveProductionConfig } from './config';
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
  ...jest.requireActual('../core/resolve-module'),
  // Override only getModulePath so path-browserify aliases stay deterministic (#26541).
  // Keep getModulePathFrom real so CodeMirror singleton resolve/include stays in lockstep.
  getModulePath: jest.fn((mod: string) => `/mock/${mod}`),
}));

jest.mock('../core/linked-packages', () => ({
  isDesignSystemLinked: jest.fn(() => false),
}));

jest.mock('../core/monorepo', () => ({
  loadStrapiMonorepo: jest.fn(async () => undefined),
}));

const createCtx = (
  httpServer = http.createServer(),
  options: Record<string, unknown> = { open: false }
) =>
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
    options,
    plugins: [],
    tsconfig: undefined,
    customisations: undefined,
    features: undefined,
  }) as unknown as BuildContext;

describe('Vite admin configuration', () => {
  it('does not copy public files into the admin build output', async () => {
    const ctx = createCtx(http.createServer(), { minify: true, sourcemaps: false });

    const config = await resolveProductionConfig(ctx);

    expect(config.publicDir).toBe(false);
  });

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

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });

  it('pre-bundles prismjs core but not language components (#26964 / blank-admin)', async () => {
    const mockHttpServer = http.createServer();
    const ctx = createCtx(mockHttpServer);

    const config = await resolveDevelopmentConfig(ctx);
    const include = config.optimizeDeps?.include ?? [];

    // Core stays prebundled (#26964). Language glob must stay out — #26978+#27014 reverse-order
    // prebundle blanks the admin with TypeError setting 'comment'.
    expect(include).toEqual(expect.arrayContaining(['prismjs']));
    expect(include).not.toContain('prismjs/components/*.js');

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

  it('preserves legacy CJS interop for custom admin bundles', async () => {
    const mockHttpServer = http.createServer();
    const ctx = createCtx(mockHttpServer);

    const config = await resolveDevelopmentConfig(ctx);

    expect(config.legacy).toEqual({ inconsistentCjsInterop: true });

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });
});
