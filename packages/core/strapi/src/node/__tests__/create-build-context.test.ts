import type { Core } from '@strapi/types';

import { createBuildContext } from '../create-build-context';

jest.mock('../core/env', () => ({
  ...jest.requireActual('../core/env'),
  loadEnv: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../core/plugins', () => ({
  getEnabledPlugins: jest.fn().mockResolvedValue({}),
  getMapOfPluginsWithAdmin: jest.fn().mockReturnValue([]),
}));

jest.mock('../core/admin-customisations', () => ({
  loadUserAppFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('node:fs/promises', () => ({
  rm: jest.fn().mockResolvedValue(undefined),
}));

const buildStrapiMock = (cookieName?: string, cookiePath?: string): Core.Strapi =>
  ({
    config: {
      get: jest.fn((key: string, def?: unknown) => {
        if (key === 'server.absoluteUrl') {
          return 'http://localhost:1337';
        }
        if (key === 'admin.absoluteUrl') {
          return 'http://localhost:1337/admin';
        }
        if (key === 'admin.path') {
          return '/admin';
        }
        if (key === 'admin.auth.cookie.name') {
          return cookieName;
        }
        if (key === 'admin.auth.cookie.path') {
          return cookiePath;
        }
        if (key === 'features') {
          return undefined;
        }
        return def;
      }),
    },
    dirs: {
      app: { root: '/app' },
      dist: { root: '/app/dist' },
    },
    telemetry: { isDisabled: true },
  }) as unknown as Core.Strapi;

const buildArgs = (strapi: Core.Strapi) => ({
  cwd: '/app',
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  strapi,
});

describe('createBuildContext', () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  it('transports admin.auth.cookie.name into STRAPI_ADMIN_AUTH_COOKIE_NAME', async () => {
    const strapi = buildStrapiMock('my_admin_jwt');

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_NAME).toBe('my_admin_jwt');
  });

  it('sets an empty STRAPI_ADMIN_AUTH_COOKIE_NAME when config is unset', async () => {
    const strapi = buildStrapiMock(undefined);

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_NAME).toBe('');
  });

  it('overrides ambient STRAPI_ADMIN_AUTH_COOKIE_NAME from process.env with config', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      STRAPI_ADMIN_AUTH_COOKIE_NAME: 'env_cookie_name',
    };

    const strapi = buildStrapiMock('config_cookie_name');

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_NAME).toBe('config_cookie_name');
  });

  it('clears ambient STRAPI_ADMIN_AUTH_COOKIE_NAME when config is unset', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      STRAPI_ADMIN_AUTH_COOKIE_NAME: 'env_cookie_name',
    };

    const strapi = buildStrapiMock(undefined);

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_NAME).toBe('');
  });

  it('transports admin.auth.cookie.path into STRAPI_ADMIN_AUTH_COOKIE_PATH', async () => {
    const strapi = buildStrapiMock(undefined, '/strapi-de/admin');

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_PATH).toBe('/strapi-de/admin');
  });

  it('sets an empty STRAPI_ADMIN_AUTH_COOKIE_PATH when config is unset', async () => {
    const strapi = buildStrapiMock(undefined, undefined);

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_PATH).toBe('');
  });

  it('overrides ambient STRAPI_ADMIN_AUTH_COOKIE_PATH from process.env with config', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      STRAPI_ADMIN_AUTH_COOKIE_PATH: '/env/admin',
    };

    const strapi = buildStrapiMock(undefined, '/config/admin');

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_PATH).toBe('/config/admin');
  });
});
