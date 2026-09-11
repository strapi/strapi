import http from 'node:http';

import type { AliasOptions } from 'vite';
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

/**
 * Vite's `AliasOptions` is an array or a record; this config always builds the record form, so a
 * custom `src/admin/vite.config` can spread `config.resolve.alias` into a new object. A RegExp
 * find or a call to `mergeAlias` would give the array form instead, which this throw catches
 */
const asAliasRecord = (alias: AliasOptions | undefined): Record<string, string> => {
  if (typeof alias !== 'object' || alias === null || Array.isArray(alias)) {
    throw new Error('expected a plain alias object');
  }

  // Array.isArray does not narrow the `readonly Alias[]` half of the union away
  return alias as Record<string, string>;
};

/**
 * A build context is a wide interface of which this config reads a handful of fields, so the tests
 * cast a literal rather than stand up a real one
 */
const buildContext = (overrides: Record<string, unknown> = {}): BuildContext =>
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
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    strapi: { internal_config: {}, server: { httpServer: http.createServer() } },
    bundler: 'vite' as const,
    options: { minify: true, sourcemap: false },
    plugins: [],
    nextDesignSystem: false,
    scanRoots: [],
    tsconfig: undefined,
    customisations: undefined,
    features: undefined,
    ...overrides,
  }) as unknown as BuildContext;

/** `react()` contributes an array, so the plugin list is one level deeper than it looks */
const pluginNames = (config: { plugins?: unknown }): string[] =>
  ((config.plugins ?? []) as { name?: string }[])
    .flat(2)
    .map((plugin) => plugin?.name)
    .filter((name): name is string => typeof name === 'string');

describe('Vite admin configuration', () => {
  it('does not copy public files into the admin build output', async () => {
    const config = await resolveProductionConfig(buildContext());

    expect(config.publicDir).toBe(false);
    expect(config.build?.rollupOptions?.input).toEqual({
      strapi: expect.stringMatching(/index\.html$/),
    });
  });

  it.each([true, false])(
    'passes options.sourcemap through to the production build config (%s)',
    async (sourcemap) => {
      // The CLI flag is `--sourcemap`, so commander stores the value on `options.sourcemap`.
      // Reading `options.sourcemaps` here silently produced `undefined` and no .map files (#22632).
      const ctx = buildContext({ options: { minify: true, sourcemap } });

      const config = await resolveProductionConfig(ctx);

      expect(config.build?.sourcemap).toBe(sourcemap);
    }
  );

  it('allows proxied hosts and pins HMR to the Strapi HTTP server without a separate clientPort (#23491)', async () => {
    const mockHttpServer = http.createServer();
    // HMR must bind to Strapi's own http.Server so websockets reuse the app port behind a proxy.
    // Mock that real source instead of injecting the server via options, so the test guards the
    // strapi.server.httpServer -> config wiring that actually fixes #23491.
    const ctx = buildContext({
      strapi: { internal_config: {}, server: { httpServer: mockHttpServer } },
      options: { open: false },
    });

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

    // Same modules need explicit aliases so pnpm can resolve optimizeDeps.include (#27014)
    const alias = asAliasRecord(config.resolve?.alias);
    expect(alias.invariant).toEqual(expect.any(String));
    expect(alias.prismjs).toEqual(expect.any(String));
    expect(alias.lodash).toEqual(expect.any(String));

    // CodeMirror must be pre-bundled and aliased for every admin build so the JSON custom
    // field keeps a single instance (JSONInput instanceof checks)
    expect(config.optimizeDeps?.include).toEqual(
      expect.arrayContaining([...ADMIN_VITE_SINGLETON_MODULES])
    );
    for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
      expect(alias[mod]).toEqual(expect.any(String));
    }

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });

  it('keeps resolve.alias a plain object in both the production and the development config', async () => {
    const mockHttpServer = http.createServer();
    const ctx = buildContext({
      strapi: { internal_config: {}, server: { httpServer: mockHttpServer } },
      options: { open: false },
    });

    const production = asAliasRecord((await resolveProductionConfig(ctx)).resolve?.alias);
    const development = asAliasRecord((await resolveDevelopmentConfig(ctx)).resolve?.alias);

    for (const alias of [production, development]) {
      for (const replacement of Object.values(alias)) {
        expect(replacement).toEqual(expect.any(String));
      }

      // The design system is a prefix alias like every other module, and the host stylesheet
      // resolves `next/source.css` through it
      expect(alias['@strapi/design-system']).toEqual(expect.any(String));
    }

    // The monorepo aliases survive the spread
    expect(development['@strapi/admin/strapi-admin']).toEqual(expect.any(String));

    await new Promise<void>((resolve) => {
      mockHttpServer.close(() => resolve());
    });
  });

  it('pre-bundles prismjs core but not language components (#26964 / blank-admin)', async () => {
    const mockHttpServer = http.createServer();
    const ctx = buildContext({
      strapi: { internal_config: {}, server: { httpServer: mockHttpServer } },
      options: { open: false },
    });

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

  it('adds the Tailwind plugin when the next design system is on', async () => {
    const config = await resolveProductionConfig(buildContext({ nextDesignSystem: true }));

    expect(pluginNames(config)).toContain('tailwindcss');
  });

  it('adds no Tailwind plugin when the next design system is off', async () => {
    const config = await resolveProductionConfig(buildContext({ nextDesignSystem: false }));

    expect(pluginNames(config)).not.toContain('tailwindcss');
  });
});
