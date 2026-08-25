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
      planPriceId: 'enterprise_monthly',
      licenseStatus: 'active',
      retainedLicense: null,
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
    contentTypes: {
      'api::a.a': {
        uid: 'api::a.a',
        attributes: { token: { type: 'string', default: 'SHOULD_BE_HIDDEN' } },
      },
    },
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
    // Not a growth-like plan price id, so it reports as Enterprise, not Growth.
    expect(dump.strapi.projectType).toBe('Enterprise');
    expect(dump.license).toBeDefined();
    expect(dump.license?.subscriptionId).toBe('sub_1');

    const serialized = JSON.stringify(dump);
    expect(serialized).not.toContain('SUPER_SECRET_KEY');
    expect(serialized).not.toContain('licenseKey');
  });

  it('reports "Growth" as the projectType when the plan price id is growth-like', async () => {
    const strapi = makeStrapi();
    strapi.ee.planPriceId = 'cms-growth-monthly';
    const dump = await debugDumpService({ strapi }).generate();

    expect(dump.strapi.edition).toBe('EE');
    expect(dump.strapi.projectType).toBe('Growth');
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

  it('redacts secret-named attributes in content-type schemas', async () => {
    const strapi = makeStrapi();
    const dump = (await debugDumpService({ strapi }).generate()) as any;

    expect(JSON.stringify(dump.contentModel.contentTypes)).not.toContain('SHOULD_BE_HIDDEN');
  });

  it('includes retained license details when the license is expired (EE disabled)', async () => {
    // `disable()` flips EE off and wipes `licenseInfo`, keeping a display-only snapshot. Without
    // reading through to it, a dump from a lapsed Enterprise instance is indistinguishable from
    // a project that never had a license, which is the case Support most often receives one for.
    const strapi = makeStrapi();
    strapi.EE = false;
    strapi.ee.planPriceId = undefined;
    strapi.ee.expireAt = undefined;
    strapi.ee.subscriptionId = undefined;
    strapi.ee.seats = undefined;
    strapi.ee.type = undefined;
    strapi.ee.licenseStatus = 'expired';
    strapi.ee.retainedLicense = {
      type: 'gold',
      isTrial: false,
      seats: 10,
      subscriptionId: 'sub_1',
      expireAt: '2026-01-01T00:00:00.000Z',
      planPriceId: 'cms-growth-monthly',
      features: [{ name: 'sso' }],
    };

    const dump = await debugDumpService({ strapi }).generate();

    expect(dump.strapi.projectType).toBe('Growth');
    expect(dump.strapi.edition).toBe('CE');
    expect(dump.license).toBeDefined();
    expect(dump.license?.licenseStatus).toBe('expired');
    expect(dump.license?.subscriptionId).toBe('sub_1');
    expect(dump.license?.seats).toBe(10);
    expect(dump.license?.type).toBe('gold');
    expect(dump.license?.features).toEqual([{ name: 'sso' }]);

    expect(JSON.stringify(dump)).not.toContain('SUPER_SECRET_KEY');
  });

  it('omits the license section in CE', async () => {
    const strapi = makeStrapi();
    strapi.EE = false;
    // A CE instance has never had a license, so there is nothing retained either.
    strapi.ee.licenseStatus = 'none';
    const dump = await debugDumpService({ strapi }).generate();
    expect(dump.license).toBeUndefined();
    expect(dump.strapi.edition).toBe('CE');
    expect(dump.strapi.projectType).toBe('Community');
  });
});
