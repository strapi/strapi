import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

import { webpack, type DefinePlugin, type Stats } from 'webpack';

import { resolveProductionConfig } from './config';
import type { BuildContext } from '../create-build-context';

jest.mock('browserslist-to-esbuild', () => ({
  __esModule: true,
  default: jest.fn(() => ['chrome100']),
}));

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
    runtimeDir: `${process.cwd()}/.strapi/client`,
    logger: { debug: jest.fn(), info: jest.fn(), error: jest.fn() },
    strapi: { internal_config: {}, server: { httpServer: http.createServer() } },
    bundler: 'webpack' as const,
    options,
    plugins: [],
    tsconfig: undefined,
    customisations: undefined,
    features: undefined,
  }) as unknown as BuildContext;

describe('Webpack admin configuration', () => {
  // The CLI flag is `--sourcemap`, so commander stores the value on `options.sourcemap`. Reading
  // `options.sourcemaps` here left devtool permanently disabled and emitted no .map files (#22632).
  it('enables the source-map devtool when options.sourcemap is true', async () => {
    const config = await resolveProductionConfig(createContext({ minify: true, sourcemap: true }));

    expect(config.devtool).toBe('source-map');
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
});
