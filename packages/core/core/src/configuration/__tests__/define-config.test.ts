import {
  defineAdminConfig,
  defineApiConfig,
  defineConfig,
  defineMiddlewaresConfig,
  defineServerConfig,
} from '../define-config';

describe('defineConfig factories', () => {
  it('returns a plain object after validating known fields', () => {
    const config = defineAdminConfig({
      auth: { secret: 'test-secret' },
      apiToken: { salt: 'test-salt' },
      flags: { nps: true },
    });

    expect(config).toEqual({
      auth: { secret: 'test-secret' },
      apiToken: { salt: 'test-salt' },
      flags: { nps: true },
    });
  });

  it('preserves unknown keys (non-breaking passthrough)', () => {
    const config = defineServerConfig({
      host: '0.0.0.0',
      port: 1337,
      customExtension: { enabled: true },
    } as Parameters<typeof defineServerConfig>[0]);

    expect(config).toMatchObject({
      host: '0.0.0.0',
      port: 1337,
      customExtension: { enabled: true },
    });
  });

  it('wraps factory functions and validates after invocation', () => {
    const factory = defineAdminConfig(({ env }) => ({
      auth: { secret: env('ADMIN_JWT_SECRET', 'fallback') },
    }));

    expect(typeof factory).toBe('function');

    const env = Object.assign(
      (key: string, defaultValue?: string) => {
        if (key === 'ADMIN_JWT_SECRET') {
          return 'from-env';
        }
        return defaultValue;
      },
      {
        int: () => 0,
        float: () => 0,
        bool: () => false,
        json: () => ({}),
        array: () => [],
        date: () => new Date(),
        oneOf: () => '',
      }
    );

    const resolved = (factory as (params: { env: typeof env }) => unknown)({ env });
    expect(resolved).toEqual({ auth: { secret: 'from-env' } });
  });

  it('throws a path-aware error for invalid field types', () => {
    expect(() =>
      defineApiConfig({
        rest: {
          // @ts-expect-error intentional invalid runtime shape for JS/TS users
          defaultLimit: 'twenty-five',
        },
      })
    ).toThrow(/Invalid Strapi config "api"/);
  });

  it('supports the generic defineConfig(namespace, config) form', () => {
    const config = defineConfig('features', {
      future: { experimental_firstPublishedAt: true },
    });

    expect(config).toEqual({
      future: { experimental_firstPublishedAt: true },
    });
  });

  it('rejects an unknown namespace at runtime', () => {
    expect(() =>
      // @ts-expect-error unknown namespace
      defineConfig('not-a-namespace', {})
    ).toThrow(/Unknown Strapi config namespace/);
  });

  it('accepts known Core.Config fields omitted from early schema drafts', () => {
    expect(() =>
      defineAdminConfig({
        forgotPassword: { expiresIn: '15m' },
      })
    ).not.toThrow();
  });

  it('throws when a factory function returns an invalid shape', () => {
    const factory = defineServerConfig(({ env }) => ({
      host: env('HOST', '0.0.0.0'),
      // @ts-expect-error intentional invalid runtime shape
      port: 'not-a-number',
    }));

    expect(() =>
      (factory as (params: { env: (key: string, fallback?: string) => string }) => unknown)({
        env: (key, fallback) => fallback ?? '',
      })
    ).toThrow(/Invalid Strapi config "server"/);
  });

  it('validates middlewares as an array of names or config objects', () => {
    const config = defineMiddlewaresConfig([
      'strapi::logger',
      { name: 'strapi::cors', config: { origin: ['*'] } },
    ]);

    expect(config).toHaveLength(2);
  });

  it('rejects a non-array middlewares config', () => {
    expect(() =>
      // @ts-expect-error intentional invalid runtime shape
      defineMiddlewaresConfig({ name: 'strapi::logger' })
    ).toThrow(/Invalid Strapi config "middlewares"/);
  });
});
