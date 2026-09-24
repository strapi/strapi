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

const mockGetModulePath = jest.fn((mod: string): string => `/app/node_modules/${mod}`);

jest.mock('../core/resolve-module', () => ({
  ...jest.requireActual('../core/resolve-module'),
  getModulePath: (mod: string) => mockGetModulePath(mod),
}));

const buildStrapiMock = (
  cookieName?: string,
  cookiePath?: string,
  cookieDomain?: string,
  legacyAuthDomain?: string,
  futureFlags: Record<string, boolean> = {}
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
    features: {
      future: { isEnabled: (name: string) => futureFlags[name] === true },
    },
  }) as unknown as Core.Strapi;

const buildStrapiMockWithFlags = (futureFlags: Record<string, boolean>): Core.Strapi =>
  buildStrapiMock(undefined, undefined, undefined, undefined, futureFlags);

const buildArgs = (strapi: Core.Strapi) => ({
  cwd: '/app',
  // The tests observe `warn` only, so the mock leaves the rest of `Logger` out
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

  describe('unstableNextDesignSystem', () => {
    it('is off and holds no scan root when the flag is absent', async () => {
      const args = buildArgs(buildStrapiMock());

      const ctx = await createBuildContext(args);

      expect(ctx.nextDesignSystem).toBe(false);
      expect(ctx.scanRoots).toEqual([]);
      expect(args.logger.warn).not.toHaveBeenCalled();
    });

    it('is on and holds the scan roots when the flag is on under Vite', async () => {
      const strapi = buildStrapiMockWithFlags({ unstableNextDesignSystem: true });

      const ctx = await createBuildContext({ ...buildArgs(strapi), options: { bundler: 'vite' } });

      expect(ctx.nextDesignSystem).toBe(true);
      expect(ctx.scanRoots).toEqual([mockScanRoot]);
    });

    it('throws with the resolutions snippet when the next entry does not resolve', async () => {
      mockGetModulePath.mockImplementationOnce(() => {
        throw new Error('Cannot find module');
      });
      const strapi = buildStrapiMockWithFlags({ unstableNextDesignSystem: true });

      const build = createBuildContext({ ...buildArgs(strapi), options: { bundler: 'vite' } });

      await expect(build).rejects.toThrow(
        /"resolutions": \{ "@strapi\/design-system": "<version>" \}/
      );
      await expect(build).rejects.toThrow(/alpha dist-tag/);
      await expect(build).rejects.not.toThrow(/experimental/);
    });

    it('resolves the next entry from the admin closure when the flag is on', async () => {
      const strapi = buildStrapiMockWithFlags({ unstableNextDesignSystem: true });

      const ctx = await createBuildContext({
        ...buildArgs(strapi),
        options: { bundler: 'vite' },
      });

      expect(ctx.nextDesignSystem).toBe(true);
      expect(mockGetModulePath).toHaveBeenCalledWith('@strapi/design-system/next/source.css');
    });

    it('resolves nothing when the flag is off', async () => {
      await createBuildContext(buildArgs(buildStrapiMock()));

      expect(mockGetModulePath).not.toHaveBeenCalledWith('@strapi/design-system/next/source.css');
    });

    it('is off and warns once when the flag is on under webpack', async () => {
      const strapi = buildStrapiMockWithFlags({ unstableNextDesignSystem: true });
      const args = { ...buildArgs(strapi), options: { bundler: 'webpack' as const } };

      const ctx = await createBuildContext(args);

      expect(ctx.nextDesignSystem).toBe(false);
      expect(ctx.scanRoots).toEqual([]);
      expect(args.logger.warn).toHaveBeenCalledTimes(1);
      expect(args.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('unstableNextDesignSystem')
      );
    });
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
