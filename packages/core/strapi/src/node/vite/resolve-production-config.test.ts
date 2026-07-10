import { resolveProductionConfig } from './config';
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
  getModulePath: jest.fn((mod: string) => `/mock/${mod}`),
}));

jest.mock('../core/linked-packages', () => ({
  isDesignSystemLinked: jest.fn(() => false),
}));

jest.mock('../core/monorepo', () => ({
  loadStrapiMonorepo: jest.fn(async () => undefined),
}));

const createCtx = () =>
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
    strapi: { internal_config: {}, server: {} },
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
  }) as unknown as BuildContext;

describe('resolveProductionConfig (Vite admin build)', () => {
  it('uses rolldownOptions for the admin entry (Vite 8)', async () => {
    const ctx = createCtx();

    const config = await resolveProductionConfig(ctx);

    expect(config.build?.rolldownOptions).toEqual({
      input: {
        strapi: ctx.entry,
      },
    });
    expect(config.build).not.toHaveProperty('rollupOptions');
  });

  it('preserves legacy CJS interop and path aliases from base config', async () => {
    const ctx = createCtx();

    const config = await resolveProductionConfig(ctx);

    expect(config.legacy).toEqual({ inconsistentCjsInterop: true });
    expect(config.resolve?.alias).toMatchObject({
      path: '/mock/path-browserify',
      'node:path': '/mock/path-browserify',
    });
  });
});
