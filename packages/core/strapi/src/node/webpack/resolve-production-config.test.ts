import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

import { webpack, type Configuration, type DefinePlugin, type Stats } from 'webpack';

import tailwindcss from '@tailwindcss/postcss';

import {
  mergeConfigWithUserConfig,
  resolveDevelopmentConfig,
  resolveProductionConfig,
} from './config';
import type { BuildContext } from '../create-build-context';
import { getSubpathEntries } from '../core/admin-vite-aliases';
import { getMonorepoAliases } from '../core/aliases';
import { loadStrapiMonorepo } from '../core/monorepo';

jest.mock('@tailwindcss/postcss', () => ({
  __esModule: true,
  default: jest.fn((options: unknown) => ({ postcssPlugin: 'tailwindcss', options })),
}));

jest.mock('browserslist-to-esbuild', () => ({
  __esModule: true,
  default: jest.fn(() => ['chrome100']),
}));

// The OS temp directory is a symlink on macOS, so the stylesheet rule must match its realpath
const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-webpack-runtime-'));

afterAll(() => fs.rmSync(runtimeDir, { recursive: true, force: true }));

const createContext = (options: Record<string, unknown>) =>
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
    runtimeDir,
    logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
    strapi: { internal_config: {}, server: { httpServer: http.createServer() } },
    bundler: 'webpack' as const,
    options,
    plugins: [],
    tsconfig: undefined,
    customisations: undefined,
    features: undefined,
  }) as unknown as BuildContext;

const definePluginDefinitions = (config: Configuration) =>
  (config.plugins ?? [])
    .filter((plugin) => plugin?.constructor.name === 'DefinePlugin')
    .map((plugin) => (plugin as { definitions?: Record<string, string> }).definitions);

describe('Webpack admin configuration', () => {
  // The CLI flag is `--sourcemap`, so commander stores the value on `options.sourcemap`. Reading
  // `options.sourcemaps` here left devtool permanently disabled and emitted no .map files (#22632).
  it('enables the source-map devtool when options.sourcemap is true', async () => {
    const config = await resolveProductionConfig(createContext({ minify: true, sourcemap: true }));

    expect(config.devtool).toBe('source-map');
  });

  describe('admin stylesheet rule', () => {
    const getCssBranches = async (options: Record<string, unknown>) => {
      const config = await resolveProductionConfig(createContext(options));
      const cssRule = config.module?.rules?.find(
        (rule) => rule && typeof rule === 'object' && String(rule.test) === String(/\.css$/i)
      );

      return cssRule && typeof cssRule === 'object' ? (cssRule.oneOf ?? []) : [];
    };

    it('runs postcss-loader with Tailwind last, on the generated stylesheet only', async () => {
      const [stylesheetRule, otherRule] = await getCssBranches({ minify: true });
      const loaders = stylesheetRule && Array.isArray(stylesheetRule.use) ? stylesheetRule.use : [];

      expect(stylesheetRule).toHaveProperty(
        'include',
        path.join(fs.realpathSync(runtimeDir), 'styles.css')
      );
      expect(loaders.at(-1)).toEqual({
        loader: require.resolve('postcss-loader'),
        options: {
          postcssOptions: {
            plugins: [{ postcssPlugin: 'tailwindcss', options: expect.anything() }],
          },
        },
      });
      expect(otherRule).toEqual({
        use: [require.resolve('style-loader'), require.resolve('css-loader')],
      });
    });

    it.each([
      [true, true],
      [false, false],
    ])('sets the Tailwind optimize option to %s when minify is %s', async (optimize, minify) => {
      await getCssBranches({ minify });

      expect(tailwindcss).toHaveBeenLastCalledWith({ optimize });
    });
  });

  it('disables devtool when options.sourcemap is false', async () => {
    const config = await resolveProductionConfig(createContext({ minify: true, sourcemap: false }));

    expect(config.devtool).toBe(false);
  });

  it('compiles TypeScript without treating generics as JSX and polyfills Node builtins', async () => {
    const config = await resolveProductionConfig(createContext({ minify: true, sourcemap: false }));
    const rules = config.module?.rules ?? [];

    const ruleFor = (pattern: RegExp) =>
      rules.find(
        (rule) =>
          rule &&
          typeof rule === 'object' &&
          'test' in rule &&
          String(rule.test) === String(pattern)
      );

    const tsRule = ruleFor(/\.ts$/);
    const tsxRule = ruleFor(/\.tsx$/);
    const jsRule = ruleFor(/\.(js|jsx|mjs)$/);

    expect(tsRule).toMatchObject({
      options: expect.objectContaining({
        loader: 'ts',
        supported: { 'arbitrary-module-namespace-names': true },
      }),
    });
    expect(tsxRule).toMatchObject({
      options: expect.objectContaining({ loader: 'tsx' }),
    });
    expect(jsRule).toMatchObject({
      use: {
        options: expect.objectContaining({
          loader: 'jsx',
          supported: { 'arbitrary-module-namespace-names': true },
        }),
      },
    });
    const fallback = config.resolve?.fallback;
    const fallbackByName = fallback && !Array.isArray(fallback) ? fallback : undefined;

    expect(String(fallbackByName?.path)).toContain('path-browserify');
    expect(String(fallbackByName?.util)).toContain(`${path.sep}util${path.sep}`);

    const definePlugin = config.plugins?.find(
      (plugin) => plugin?.constructor.name === 'DefinePlugin'
    );
    const definitions = (definePlugin as { definitions?: Record<string, string> } | undefined)
      ?.definitions;

    expect(definitions?.['process.env.NODE_ENV']).toBe(JSON.stringify('production'));
    expect(JSON.parse(definitions?.['process.env'] ?? '{}')).toMatchObject({
      NODE_ENV: 'production',
    });
  });

  // Webpack takes the first matching key. A bare key `x` matches `x` and `x/…`, a key `x$` only `x`
  it.each([
    ['production', resolveProductionConfig, false],
    ['development', resolveDevelopmentConfig, true],
  ])(
    'aliases every design system export subpath in the %s config, with no key shadowed',
    async (_, resolveConfig, withMonorepo) => {
      const config = await resolveConfig(createContext({ minify: true, sourcemap: false }));
      const aliasOption = config.resolve?.alias;
      const alias = aliasOption && !Array.isArray(aliasOption) ? aliasOption : {};
      const keys = Object.keys(alias);
      const matches = (key: string, request: string) =>
        key.endsWith('$')
          ? request === key.slice(0, -1)
          : request === key || request.startsWith(`${key}/`);

      const entries = getSubpathEntries('@strapi/design-system');
      expect(entries.length).toBeGreaterThan(0);

      for (const [key, file] of entries) {
        expect(alias[`${key}$`]).toBe(file);
      }

      const monorepoAliases = withMonorepo
        ? getMonorepoAliases({ monorepo: await loadStrapiMonorepo(process.cwd()) })
        : {};
      expect(Object.keys(monorepoAliases).length > 0).toBe(withMonorepo);
      expect(alias).toMatchObject(monorepoAliases);

      keys.forEach((key, index) => {
        const request = key.replace(/\$$/, '');
        expect(keys.slice(0, index).filter((earlier) => matches(earlier, request))).toEqual([]);
      });
    }
  );

  // The Content-Type Builder bundles micromatch, whose picomatch reads `process.platform` on load.
  it('bundles micromatch so it runs without a `process` global', async () => {
    const config = await resolveProductionConfig(createContext({ minify: true, sourcemap: false }));
    const definePlugin = config.plugins?.find(
      (plugin) => plugin?.constructor.name === 'DefinePlugin'
    ) as DefinePlugin;
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-webpack-micromatch-'));

    try {
      fs.writeFileSync(
        path.join(directory, 'index.js'),
        "globalThis.result = require('micromatch').isMatch('src/index.js', ['**/*.js']);\n"
      );

      const stats = await new Promise<Stats | undefined>((resolve, reject) => {
        webpack(
          {
            mode: 'none',
            target: 'web',
            context: directory,
            entry: './index.js',
            output: { path: path.join(directory, 'dist'), filename: 'main.js' },
            resolve: {
              fallback: config.resolve?.fallback,
              modules: ['node_modules', path.dirname(path.dirname(require.resolve('micromatch')))],
            },
            plugins: [definePlugin],
          },
          (error, result) => (error ? reject(error) : resolve(result))
        );
      });

      expect(stats?.hasErrors()).toBe(false);

      const sandbox: { result?: boolean } = {};
      vm.runInNewContext(fs.readFileSync(path.join(directory, 'dist', 'main.js'), 'utf8'), {
        globalThis: sandbox,
      });

      expect(sandbox.result).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 30000);

  it('keeps Strapi process.env when the user webpack config does not define it', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-webpack-user-env-'));

    try {
      const ctx = createContext({ minify: true, sourcemap: false });
      ctx.appDir = directory;
      const config = await mergeConfigWithUserConfig(await resolveProductionConfig(ctx), ctx);
      const definitions = definePluginDefinitions(config)[0];

      expect(JSON.parse(definitions?.['process.env'] ?? '{}')).toMatchObject({
        NODE_ENV: 'production',
      });
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  // Webpack keeps the first DefinePlugin value for an expression. Strapi's plugin is first,
  // so a user's bare `process.env` define must replace Strapi's object or it never reaches
  // the bundle. Per-key `process.env.NODE_ENV` still comes from Strapi.
  it('uses a user process.env define from src/admin/webpack.config.js', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-webpack-user-env-'));
    const adminDir = path.join(directory, 'src', 'admin');
    fs.mkdirSync(adminDir, { recursive: true });
    const webpackPath = JSON.stringify(require.resolve('webpack'));
    fs.writeFileSync(
      path.join(adminDir, 'webpack.config.js'),
      `module.exports = (config) => {
        const webpack = require(${webpackPath});
        config.plugins.push(
          new webpack.DefinePlugin({
            'process.env': JSON.stringify({ FROM_USER: 'yes', NODE_ENV: 'from-user-object' }),
          })
        );
        return config;
      };
      `
    );

    try {
      const ctx = createContext({ minify: true, sourcemap: false });
      ctx.appDir = directory;
      const config = await mergeConfigWithUserConfig(await resolveProductionConfig(ctx), ctx);
      const definitions = definePluginDefinitions(config);

      expect(definitions).toHaveLength(2);
      expect(definitions[0]?.['process.env']).toBeUndefined();
      expect(definitions[0]?.['process.env.NODE_ENV']).toBe(JSON.stringify('production'));
      expect(JSON.parse(definitions[1]?.['process.env'] ?? '{}')).toMatchObject({
        FROM_USER: 'yes',
      });

      fs.writeFileSync(
        path.join(directory, 'index.js'),
        'globalThis.result = { fromUser: process.env.FROM_USER, nodeEnv: process.env.NODE_ENV, whole: process.env };\n'
      );

      const definePlugins = (config.plugins ?? []).filter(
        (plugin) => plugin?.constructor.name === 'DefinePlugin'
      );

      const stats = await new Promise<Stats | undefined>((resolve, reject) => {
        webpack(
          {
            mode: 'none',
            target: 'web',
            context: directory,
            entry: './index.js',
            output: { path: path.join(directory, 'dist'), filename: 'main.js' },
            plugins: definePlugins,
          },
          (error, result) => (error ? reject(error) : resolve(result))
        );
      });

      expect(stats?.hasErrors()).toBe(false);
      expect(stats?.hasWarnings()).toBe(false);

      const sandbox: {
        result?: {
          fromUser?: string;
          nodeEnv?: string;
          whole?: { FROM_USER?: string; NODE_ENV?: string };
        };
      } = {};
      vm.runInNewContext(fs.readFileSync(path.join(directory, 'dist', 'main.js'), 'utf8'), {
        globalThis: sandbox,
      });

      expect(sandbox.result).toEqual({
        fromUser: 'yes',
        nodeEnv: 'production',
        whole: { FROM_USER: 'yes', NODE_ENV: 'from-user-object' },
      });
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 30000);
});
