import http from 'node:http';

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
});
