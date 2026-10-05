import os from 'os';
import path from 'path';

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
      entitlements: { list: () => [], listRetained: () => [] },
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
    get: (name: string) => (name === 'modules' ? { getAll: () => ({}) } : undefined),
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

  it('reports Community when a license never validated and left no plan', async () => {
    // disable() sets licenseStatus to "unknown" even when verification threw before a type
    // existed, so there is no retained snapshot. projectType must not fall through to
    // Enterprise just because the status is not "none".
    const strapi = makeStrapi();
    strapi.EE = false;
    strapi.ee.licenseStatus = 'unknown';
    strapi.ee.type = undefined;
    strapi.ee.planPriceId = undefined;
    strapi.ee.retainedLicense = null;

    const dump = await debugDumpService({ strapi }).generate();

    expect(dump.strapi.projectType).toBe('Community');
    expect(dump.strapi.edition).toBe('CE');
  });

  it("reports a lapsed license's entitlements from the retained snapshot", async () => {
    // The live list is empty once the license is disabled; Support still needs the limits the
    // plan enforced, resolved with the same defaults and clamps.
    const strapi = makeStrapi();
    strapi.EE = false;
    strapi.ee.licenseStatus = 'expired';
    strapi.ee.retainedLicense = { type: 'gold', features: [{ name: 'audit-logs' }] };
    strapi.ee.entitlements = {
      list: () => [],
      listRetained: () => [
        { feature: 'audit-logs', limits: [{ key: 'retentionDays', unit: 'days', value: 90 }] },
      ],
    };

    const dump = await debugDumpService({ strapi }).generate();

    expect(dump.license?.entitlements).toEqual([
      { feature: 'audit-logs', limits: [{ key: 'retentionDays', unit: 'days', value: 90 }] },
    ]);
  });

  it('includes module config stored after the config provider was built, scrubbed', async () => {
    // Module config (plugin::*, api::*) is stored with config.set after the provider object is
    // created, so it is not an own property of that object; only config.get reaches it.
    const strapi = makeStrapi();
    const live: Record<string, unknown> = {
      'plugin::upload': {
        provider: 'aws-s3',
        providerOptions: { s3Options: { credentials: { secretAccessKey: 'S3_SECRET' } } },
      },
      'plugin::email': {
        provider: 'sendgrid',
        providerOptions: { apiKey: 'SG_SECRET' },
        settings: { defaultFrom: 'team@example.com' },
      },
    };
    const config = strapi.config as any;
    const originalGet = config.get;
    delete config['plugin::upload'];
    delete config['plugin::email'];
    config.get = (key: string, def?: unknown) => (key in live ? live[key] : originalGet(key, def));
    strapi.get = (name: string) =>
      name === 'modules'
        ? { getAll: () => ({ 'plugin::upload': {}, 'plugin::email': {} }) }
        : undefined;

    const dump = await debugDumpService({ strapi }).generate();
    const dumpConfig = dump.config as Record<string, any>;

    // `plugin::email.settings` is one of the wholesale-masked paths
    expect(dumpConfig['plugin::email']).toMatchObject({ provider: 'sendgrid', settings: REDACTED });
    expect(dumpConfig['plugin::upload']).toMatchObject({ provider: 'aws-s3' });
    expect(JSON.stringify(dump)).not.toContain('SG_SECRET');
    expect(JSON.stringify(dump)).not.toContain('S3_SECRET');
  });

  it('reports an ended trial as not a trial, matching the license endpoint', async () => {
    // disable() clears the live trial flag but the retained snapshot still says it was one;
    // the Plan card follows the live flag, so the dump must too.
    const strapi = makeStrapi();
    strapi.EE = false;
    strapi.ee.isTrial = false;
    strapi.ee.licenseStatus = 'expired';
    strapi.ee.retainedLicense = { type: 'gold', isTrial: true, features: [] };

    const dump = await debugDumpService({ strapi }).generate();

    expect(dump.license?.isTrial).toBe(false);
  });

  it('rewrites a SQLite file outside the project to a <home> placeholder', async () => {
    // getInfo() makes the path relative to the working directory, which can still climb into
    // the user's home directory (`../../home/<user>/...`).
    const dbFile = path.join(os.homedir(), 'strapi-data', 'db.sqlite');
    const strapi = makeStrapi();
    strapi.db.getInfo = () => ({
      client: 'sqlite',
      schema: undefined,
      displayName: path.relative(process.cwd(), dbFile),
    });

    const dump = await debugDumpService({ strapi }).generate();

    expect(dump.database.displayName).toBe(`<home>${path.sep}strapi-data${path.sep}db.sqlite`);
  });
});
