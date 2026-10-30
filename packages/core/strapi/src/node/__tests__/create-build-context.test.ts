import type { Core } from '@strapi/types';

import type { Logger } from '../../cli/utils/logger';

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

const mockScanRoot = '/app/node_modules/@strapi/admin/dist/admin';

jest.mock('../core/scan-roots', () => ({
  getScanRoots: jest.fn(async () => [mockScanRoot]),
}));

const buildStrapiMock = (
  cookieName?: string,
  cookiePath?: string,
  cookieDomain?: string,
  legacyAuthDomain?: string
): Core.Strapi =>
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
        if (key === 'admin.auth.cookie.domain') {
          return cookieDomain;
        }
        if (key === 'admin.auth.domain') {
          return legacyAuthDomain;
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
  // The tests observe `debug` only, so the mock leaves the rest of `Logger` out
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger,
  strapi,
});

describe('createBuildContext', () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  it('holds the Tailwind scan roots under Vite', async () => {
    const ctx = await createBuildContext(buildArgs(buildStrapiMock()));

    expect(ctx.scanRoots).toEqual([mockScanRoot]);
  });

  it('holds no scan root under webpack', async () => {
    const ctx = await createBuildContext({
      ...buildArgs(buildStrapiMock()),
      options: { bundler: 'webpack' },
    });

    expect(ctx.scanRoots).toEqual([]);
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

  describe('STRAPI_ADMIN_AUTH_COOKIE_PATH when admin.auth.cookie.path is unset', () => {
    // Overrides the URL config with what packages/core/core/src/configuration resolves.
    const withUrls = (strapi: Core.Strapi, urls: Record<string, string>) => {
      const get = strapi.config.get as jest.Mock;
      const original = get.getMockImplementation()!;
      get.mockImplementation((key: string, def?: unknown) =>
        key in urls ? urls[key] : original(key, def)
      );
      return strapi;
    };

    it('uses the default admin panel path', async () => {
      const ctx = await createBuildContext(buildArgs(buildStrapiMock()));

      expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_PATH).toBe('/admin');
    });

    it('follows a custom admin.url so the panel can read its own cookie', async () => {
      const strapi = withUrls(buildStrapiMock(), {
        'admin.absoluteUrl': 'http://localhost:1337/dashboard',
        'admin.path': '/dashboard',
      });

      const ctx = await createBuildContext(buildArgs(strapi));

      expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_PATH).toBe('/dashboard');
    });

    it('includes a server.url subpath, which admin.path leaves out', async () => {
      const strapi = withUrls(buildStrapiMock(), {
        'server.absoluteUrl': 'https://example.com/strapi',
        'admin.absoluteUrl': 'https://example.com/strapi/admin',
        'admin.path': '/admin',
      });

      const ctx = await createBuildContext(buildArgs(strapi));

      expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_PATH).toBe('/strapi/admin');
    });

    it('treats a blank admin.auth.cookie.path as unset', async () => {
      const strapi = withUrls(buildStrapiMock(undefined, '  '), {
        'admin.absoluteUrl': 'http://localhost:1337/dashboard',
        'admin.path': '/dashboard',
      });

      const ctx = await createBuildContext(buildArgs(strapi));

      expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_PATH).toBe('/dashboard');
    });
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

  it('transports admin.auth.cookie.domain into STRAPI_ADMIN_AUTH_COOKIE_DOMAIN', async () => {
    const strapi = buildStrapiMock(undefined, undefined, 'strapi.test');

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_DOMAIN).toBe('strapi.test');
  });

  it('falls back to admin.auth.domain for STRAPI_ADMIN_AUTH_COOKIE_DOMAIN', async () => {
    const strapi = buildStrapiMock(undefined, undefined, undefined, 'legacy.strapi.test');

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_DOMAIN).toBe('legacy.strapi.test');
  });

  it('prefers admin.auth.cookie.domain over admin.auth.domain', async () => {
    const strapi = buildStrapiMock(
      undefined,
      undefined,
      'cookie.strapi.test',
      'legacy.strapi.test'
    );

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_DOMAIN).toBe('cookie.strapi.test');
  });

  it('sets an empty STRAPI_ADMIN_AUTH_COOKIE_DOMAIN when config is unset', async () => {
    const strapi = buildStrapiMock(undefined, undefined, undefined, undefined);

    const ctx = await createBuildContext(buildArgs(strapi));

    expect(ctx.env.STRAPI_ADMIN_AUTH_COOKIE_DOMAIN).toBe('');
  });
});
