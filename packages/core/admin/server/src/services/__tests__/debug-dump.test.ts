import { REDACTED } from '../../utils/debug-dump/redact';
import debugDumpService from '../debug-dump';

const makeStrapi = () =>
  ({
    EE: true,
    ee: {
      type: 'gold',
      isTrial: false,
      seats: 10,
      subscriptionId: 'sub_1',
      expireAt: '2026-12-31T00:00:00.000Z',
      features: { list: () => [{ name: 'sso' }] },
      entitlements: { list: () => [] },
      licenseInfo: { licenseKey: 'SUPER_SECRET_KEY' },
    },
    config: (() => {
      const values: Record<string, unknown> = {
        environment: 'development',
        autoReload: true,
        info: {
          strapi: '5.0.0',
          name: 'app',
          version: '0.1.0',
          dependencies: { '@strapi/strapi': '5.0.0' },
        },
        'plugin::upload': { provider: 'local' },
        'plugin::email': { provider: 'sendmail', providerOptions: { apiKey: 'SECRET' } },
        server: { port: 1337, app: { keys: ['k1', 'k2'] } },
        database: { connection: { connection: { password: 'pw', host: 'db' } } },
        uuid: 'uuid-1',
        dirs: { app: { root: '/home/u/app' } },
      };
      return {
        ...values,
        get(key: string, def?: unknown) {
          const found = key
            .split('.')
            .reduce<unknown>(
              (acc, seg) =>
                acc != null && typeof acc === 'object'
                  ? (acc as Record<string, unknown>)[seg]
                  : undefined,
              values
            );
          return found === undefined ? def : found;
        },
      };
    })(),
    dirs: { app: { root: '/home/u/app' } },
    db: { getInfo: () => ({ client: 'sqlite', schema: undefined, displayName: '.tmp/data.db' }) },
    plugins: { 'users-permissions': {}, i18n: {} },
    plugin: () => ({ provider: { isPrivate: () => false } }),
    contentTypes: {},
    components: {},
    getCustomizations: () => ({
      apis: [],
      counts: { customControllers: 0, customServices: 0, customRoutes: 0 },
      srcIndex: {
        present: true,
        registerDefined: true,
        registerNonEmpty: false,
        bootstrapDefined: true,
        bootstrapNonEmpty: false,
        destroyDefined: false,
        destroyNonEmpty: false,
        beyondTemplate: false,
      },
    }),
    log: { error() {} },
  }) as any;

describe('debug-dump service', () => {
  it('assembles the payload with the license section in EE and never leaks the license key', async () => {
    const strapi = makeStrapi();
    const dump = await debugDumpService({ strapi }).generate();

    expect(dump.dumpVersion).toBe(1);
    expect(dump.strapi.edition).toBe('EE');
    expect(dump.license).toBeDefined();
    expect(dump.license?.subscriptionId).toBe('sub_1');

    const serialized = JSON.stringify(dump);
    expect(serialized).not.toContain('SUPER_SECRET_KEY');
    expect(serialized).not.toContain('licenseKey');
  });

  it('masks secrets in the full config block', async () => {
    const strapi = makeStrapi();
    const dump = (await debugDumpService({ strapi }).generate()) as any;

    expect(dump.config.server.app.keys).toBe(REDACTED);
    expect(dump.config.database.connection.connection).toBe(REDACTED);
    expect(dump.config['plugin::email'].providerOptions).toBe(REDACTED);
    // non-secret config survives
    expect(dump.config.server.port).toBe(1337);
  });

  it('omits the license section in CE', async () => {
    const strapi = makeStrapi();
    strapi.EE = false;
    const dump = await debugDumpService({ strapi }).generate();
    expect(dump.license).toBeUndefined();
    expect(dump.strapi.edition).toBe('CE');
  });
});
