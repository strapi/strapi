import http from 'node:http';

import type { Alias } from 'vite';
import { ADMIN_VITE_SINGLETON_MODULES } from '../core/admin-vite-alias-modules';
import { resolveDevelopmentConfig, resolveProductionConfig } from './config';
import type { BuildContext } from '../create-build-context';

jest.mock('browserslist-to-esbuild', () => ({
  __esModule: true,
  default: jest.fn(() => ['chrome100']),
}));

jest.mock('@tailwindcss/vite', () => ({
  __esModule: true,
  default: jest.fn(() => ({ name: 'tailwindcss' })),
}));

describe('Vite admin configuration', () => {
  it('does not copy public files into the admin build output', async () => {
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
      strapi: { internal_config: {}, server: { httpServer: http.createServer() } },
      bundler: 'vite' as const,
      options: {
        minify: true,
        sourcemaps: false,
      },
      plugins: [],
      scanRoots: [],
      tsconfig: undefined,
      customisations: undefined,
      features: undefined,
    } as unknown as BuildContext;

    const config = await resolveProductionConfig(ctx);

    expect(config.publicDir).toBe(false);
  });

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
      scanRoots: [],
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
    expect((config.server?.hmr as { clientPort?: number } | undefined)?.clientPort).toBeUndefined();

    // CJS-only deps imported by @strapi/admin must stay pre-bundled in dev (#26944, #26964, #27014).
    expect(config.optimizeDeps?.include).toEqual(
      expect.arrayContaining(['invariant', 'lodash', 'prismjs'])
    );

    // Same modules need explicit aliases so pnpm can resolve optimizeDeps.include (#27014).
    // Vite's `AliasOptions` is an array or a record; this config always builds the array form
    const alias = config.resolve?.alias as Array<{ find: string | RegExp; replacement: string }>;
    const replacementFor = (mod: string) => alias?.find((entry) => entry.find === mod)?.replacement;
    expect(replacementFor('invariant')).toEqual(expect.any(String));
    expect(replacementFor('prismjs')).toEqual(expect.any(String));
    expect(replacementFor('lodash')).toEqual(expect.any(String));

    // CodeMirror must be pre-bundled and aliased for every admin build so the JSON custom
    // field keeps a single instance (JSONInput instanceof checks)
    expect(config.optimizeDeps?.include).toEqual(
      expect.arrayContaining([...ADMIN_VITE_SINGLETON_MODULES])
    );
    for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
      expect(replacementFor(mod)).toEqual(expect.any(String));
    }

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });

  it('pins the design system alias to the bare specifier and leaves the rest as strings', async () => {
    const mockHttpServer = http.createServer();
    // A partial BuildContext: the config builder reads a handful of fields, and a whole one would
    // need a live Strapi instance
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
      options: { open: false },
      plugins: [],
      scanRoots: [],
      tsconfig: undefined,
      customisations: undefined,
      features: undefined,
    } as unknown as BuildContext;

    const config = await resolveDevelopmentConfig(ctx);
    // Vite's `AliasOptions` is an array or a record; this config always builds the array form
    const alias = config.resolve?.alias as Alias[];
    // Pin the entry by the specifier it matches, so a second regex alias cannot take its place
    const designSystem = alias.find((entry) =>
      entry.find instanceof RegExp
        ? entry.find.test('@strapi/design-system')
        : entry.find === '@strapi/design-system'
    )?.find;

    expect(designSystem).toBeInstanceOf(RegExp);
    // A prefix match would rewrite the subpath and skip the exports map, so `next/styles.css`
    // must miss
    expect(
      designSystem instanceof RegExp && designSystem.test('@strapi/design-system/next/styles.css')
    ).toBe(false);

    // Every other module keeps the prefix match a string find gives
    expect(alias.filter((entry) => typeof entry.find === 'string').length).toBeGreaterThan(0);

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });

  it('writes the watch-ignore negations as forward-slash globs', async () => {
    const mockHttpServer = http.createServer();
    // A partial BuildContext: the config builder reads a handful of fields, and a whole one would
    // need a live Strapi instance
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
      options: { open: false },
      plugins: [],
      // A backslash segment stands in for a Windows root. The `node_modules` filter splits on the
      // host separator, so the leading segments stay forward slashes to keep the test host-neutral
      scanRoots: ['/app/node_modules/@strapi\\admin\\dist', '/app/src/admin'],
      tsconfig: undefined,
      customisations: undefined,
      features: undefined,
    } as unknown as BuildContext;

    const config = await resolveDevelopmentConfig(ctx);

    // picomatch reads a backslash as an escape, so a native Windows path never matches
    expect(config.server?.watch?.ignored).toEqual(['!/app/node_modules/@strapi/admin/dist/**']);

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });

  it('pre-bundles prismjs core but not language components (#26964 / blank-admin)', async () => {
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
      scanRoots: [],
      tsconfig: undefined,
      customisations: undefined,
      features: undefined,
    } as unknown as BuildContext;

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
});
