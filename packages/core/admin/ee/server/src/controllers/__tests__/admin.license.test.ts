import adminController from '../admin';

const GOLD_CATALOG = [
  'sso',
  'cms-advanced-preview',
  'cms-content-releases',
  'review-workflows',
  'cms-content-history',
  'audit-logs',
];

const createStrapiMock = (overrides: any = {}) => {
  const stored = overrides.stored ?? null;
  global.strapi = {
    EE: true,
    config: {
      // Mirrors the real config provider's `get(key, defaultValue)` signature: with no
      // config set up, it just echoes back the caller's default.
      get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
    },
    ee: {
      seats: 10,
      type: 'gold',
      isTrial: false,
      subscriptionId: 'sub_123',
      expireAt: '2026-12-31T00:00:00.000Z',
      licenseStatus: 'active',
      renewalDate: null,
      retainedLicense: null,
      planFeatureCatalog: GOLD_CATALOG,
      features: {
        list: () => [{ name: 'sso' }],
        isEnabled: (name: string) => ['sso', 'audit-logs'].includes(name),
      },
      entitlements: {
        list: () => [
          { feature: 'audit-logs', limits: [{ key: 'retentionDays', unit: 'days', value: 90 }] },
        ],
      },
      ...overrides.ee,
    },
    db: {
      query: () => ({ findOne: async () => stored }),
    },
    ...overrides.strapi,
  } as any;
  return global.strapi;
};

const stubUserServices = () => {
  (global.strapi as any).service = () => ({
    getCurrentActiveUserCount: async () => 0,
    getDisabledUserList: async () => [],
  });
};

describe('getProjectType', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('reports licenseStatus/licensedPlan alongside isEE for an active license', async () => {
    createStrapiMock({
      ee: {
        planPriceId: 'enterprise-plan',
      },
    });

    const data = (await adminController.getProjectType()).data as any;

    expect(data.isEE).toBe(true);
    expect(data.licenseStatus).toBe('active');
    expect(data.licensedPlan).toBe('Enterprise');
  });

  it('reports a Growth licensedPlan when the planPriceId names the Growth plan', async () => {
    createStrapiMock({
      ee: {
        planPriceId: 'strapi-growth-plan',
      },
    });

    const data = (await adminController.getProjectType()).data as any;

    expect(data.licensedPlan).toBe('Growth');
  });

  it('an expired license: isEE stays false, but licensedPlan is resolved from the retained planPriceId', async () => {
    createStrapiMock({
      // `disable()` flips `strapi.EE`/`ee.enabled` to false once a license is no longer usable
      // - mirrored here rather than left at the mock's default `true`.
      strapi: { EE: false },
      ee: {
        type: null,
        planPriceId: null,
        licenseStatus: 'expired',
        retainedLicense: {
          type: 'gold',
          planPriceId: 'enterprise-plan',
        },
      },
    });

    const data = (await adminController.getProjectType()).data as any;

    // The important assertion: an expired license must never flip isEE on. licensedPlan is
    // display-only and is allowed to still say "Enterprise".
    expect(data.isEE).toBe(false);
    expect(data.licenseStatus).toBe('expired');
    expect(data.licensedPlan).toBe('Enterprise');
  });

  it('reports licenseStatus "none" and licensedPlan "Community" when there is no license at all', async () => {
    createStrapiMock({
      strapi: { EE: false },
      ee: {
        type: null,
        planPriceId: null,
        licenseStatus: 'none',
        retainedLicense: null,
      },
    });

    const data = (await adminController.getProjectType()).data as any;

    expect(data.isEE).toBe(false);
    expect(data.licenseStatus).toBe('none');
    expect(data.licensedPlan).toBe('Community');
  });
});

describe('licenseLimitInformation (extended fields)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('reports online mode with registry sync metadata from ee_information', async () => {
    createStrapiMock({
      stored: {
        value: JSON.stringify({ license: 'signed', lastCheckAt: 1700000000000 }),
      },
    });
    // getService is resolved via strapi.service in the ee controller util; stub it.
    (global.strapi as any).service = () => ({
      getCurrentActiveUserCount: async () => 3,
      getDisabledUserList: async () => [],
    });

    const data = (await adminController.licenseLimitInformation()).data as any;

    expect(data.expireAt).toBe('2026-12-31T00:00:00.000Z');
    expect(data.seats).toBe(10);
    expect(data.subscriptionId).toBe('sub_123');
    expect(data.licenseMode).toBe('online');
    expect(data.lastRegistrySyncAt).toBe(1700000000000);
    expect(data.usingCachedLicense).toBe(false);
    expect(data.registrySyncError).toBeNull();
    expect(data.entitlements).toEqual([
      { feature: 'audit-logs', limits: [{ key: 'retentionDays', unit: 'days', value: 90 }] },
    ]);
  });

  it('reports offline mode for gold + STRAPI_DISABLE_LICENSE_PING=true', async () => {
    createStrapiMock({ stored: null });
    process.env.STRAPI_DISABLE_LICENSE_PING = 'true';
    (global.strapi as any).service = () => ({
      getCurrentActiveUserCount: async () => 0,
      getDisabledUserList: async () => [],
    });

    const data = (await adminController.licenseLimitInformation()).data as any;
    expect(data.licenseMode).toBe('offline');
    expect(data.lastRegistrySyncAt).toBeNull();
  });

  it('flags usingCachedLicense when the last sync errored but a cached license exists', async () => {
    createStrapiMock({
      stored: { value: JSON.stringify({ license: 'cached', error: 'network', lastCheckAt: 1 }) },
    });
    (global.strapi as any).service = () => ({
      getCurrentActiveUserCount: async () => 0,
      getDisabledUserList: async () => [],
    });

    const data = (await adminController.licenseLimitInformation()).data as any;
    expect(data.usingCachedLicense).toBe(true);
    expect(data.registrySyncError).toBe('network');
  });

  it('does not flag usingCachedLicense when there is an error but no cached license', async () => {
    createStrapiMock({
      stored: { value: JSON.stringify({ error: 'network', lastCheckAt: 1 }) },
    });
    (global.strapi as any).service = () => ({
      getCurrentActiveUserCount: async () => 0,
      getDisabledUserList: async () => [],
    });

    const data = (await adminController.licenseLimitInformation()).data as any;
    expect(data.usingCachedLicense).toBe(false);
    expect(data.registrySyncError).toBe('network');
  });

  it('does not flag usingCachedLicense when there is a license but no error', async () => {
    createStrapiMock({
      stored: { value: JSON.stringify({ license: 'signed', lastCheckAt: 1 }) },
    });
    (global.strapi as any).service = () => ({
      getCurrentActiveUserCount: async () => 0,
      getDisabledUserList: async () => [],
    });

    const data = (await adminController.licenseLimitInformation()).data as any;
    expect(data.usingCachedLicense).toBe(false);
    expect(data.registrySyncError).toBeNull();
  });

  it('rolls nextRegistrySyncAt forward to the next future 12h check-in when online', async () => {
    const interval = 12 * 60 * 60 * 1000;
    const lastCheckAt = 1700000000000; // in the past
    createStrapiMock({
      stored: { value: JSON.stringify({ license: 'signed', lastCheckAt }) },
    });
    (global.strapi as any).service = () => ({
      getCurrentActiveUserCount: async () => 3,
      getDisabledUserList: async () => [],
    });

    const data = (await adminController.licenseLimitInformation()).data as any;
    const now = Date.now();
    expect(data.licenseMode).toBe('online');
    // last check-in is reported as stored; next is the first future 12h boundary
    expect(data.lastRegistrySyncAt).toBe(lastCheckAt);
    expect(data.nextRegistrySyncAt).toBeGreaterThan(now);
    expect((data.nextRegistrySyncAt - lastCheckAt) % interval).toBe(0);
    expect(data.nextRegistrySyncAt - interval).toBeLessThanOrEqual(now);
  });

  it('keeps nextRegistrySyncAt at lastCheckAt + 12h when that is still in the future', async () => {
    const interval = 12 * 60 * 60 * 1000;
    const lastCheckAt = Date.now() - 60 * 1000; // a minute ago
    createStrapiMock({
      stored: { value: JSON.stringify({ license: 'signed', lastCheckAt }) },
    });
    (global.strapi as any).service = () => ({
      getCurrentActiveUserCount: async () => 3,
      getDisabledUserList: async () => [],
    });

    const data = (await adminController.licenseLimitInformation()).data as any;
    expect(data.nextRegistrySyncAt).toBe(lastCheckAt + interval);
  });

  it('sets nextRegistrySyncAt to null when offline', async () => {
    createStrapiMock({ stored: null });
    process.env.STRAPI_DISABLE_LICENSE_PING = 'true';
    (global.strapi as any).service = () => ({
      getCurrentActiveUserCount: async () => 0,
      getDisabledUserList: async () => [],
    });

    const data = (await adminController.licenseLimitInformation()).data as any;
    expect(data.licenseMode).toBe('offline');
    expect(data.nextRegistrySyncAt).toBeNull();
  });
});

describe('licenseLimitInformation (planEntitlements)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('active gold license: lists the 6 gold features in catalog order with availability and limits', async () => {
    createStrapiMock({ stored: null });
    stubUserServices();

    const data = (await adminController.licenseLimitInformation()).data as any;

    expect(data.licenseStatus).toBe('active');
    expect(data.planEntitlements.map((entry: any) => entry.feature)).toEqual(GOLD_CATALOG);

    const sso = data.planEntitlements.find((entry: any) => entry.feature === 'sso');
    expect(sso).toEqual({ feature: 'sso', available: true, limits: [] });

    const auditLogs = data.planEntitlements.find((entry: any) => entry.feature === 'audit-logs');
    expect(auditLogs.available).toBe(true);
    expect(auditLogs.limits).toEqual([{ key: 'retentionDays', unit: 'days', value: 90 }]);
  });

  it('active silver license without sso: sso is unavailable', async () => {
    createStrapiMock({
      stored: null,
      ee: {
        type: 'silver',
        planFeatureCatalog: [
          'sso',
          'cms-advanced-preview',
          'cms-content-releases',
          'cms-content-history',
        ],
        features: {
          list: () => [{ name: 'cms-advanced-preview' }],
          isEnabled: (name: string) => name === 'cms-advanced-preview',
        },
        entitlements: { list: () => [] },
      },
    });
    stubUserServices();

    const data = (await adminController.licenseLimitInformation()).data as any;

    const sso = data.planEntitlements.find((entry: any) => entry.feature === 'sso');
    expect(sso).toEqual({ feature: 'sso', available: false, limits: [] });
  });

  it('expired license: falls back to the retained snapshot for type/subscriptionId and planEntitlements', async () => {
    createStrapiMock({
      stored: null,
      ee: {
        type: null,
        seats: null,
        subscriptionId: null,
        expireAt: null,
        licenseStatus: 'expired',
        retainedLicense: {
          type: 'gold',
          seats: 10,
          subscriptionId: 'sub_123',
          expireAt: '2026-01-01T00:00:00.000Z',
          isTrial: false,
          features: [{ name: 'sso' }, { name: 'audit-logs', options: { retentionDays: 90 } }],
        },
        features: { list: () => [], isEnabled: () => false },
        entitlements: { list: () => [] },
      },
    });
    stubUserServices();

    const data = (await adminController.licenseLimitInformation()).data as any;

    expect(data.licenseStatus).toBe('expired');
    expect(data.type).toBe('gold');
    expect(data.subscriptionId).toBe('sub_123');
    expect(data.seats).toBe(10);
    expect(data.expireAt).toBe('2026-01-01T00:00:00.000Z');

    const sso = data.planEntitlements.find((entry: any) => entry.feature === 'sso');
    expect(sso).toEqual({ feature: 'sso', available: true, limits: [] });

    const auditLogs = data.planEntitlements.find((entry: any) => entry.feature === 'audit-logs');
    expect(auditLogs.available).toBe(true);
    expect(auditLogs.limits).toEqual([{ key: 'retentionDays', unit: 'days', value: 90 }]);

    const reviewWorkflows = data.planEntitlements.find(
      (entry: any) => entry.feature === 'review-workflows'
    );
    expect(reviewWorkflows).toEqual({ feature: 'review-workflows', available: false, limits: [] });
  });

  it('a retained option value at/above the unlimited threshold normalizes to null', async () => {
    createStrapiMock({
      stored: null,
      ee: {
        type: null,
        licenseStatus: 'expired',
        retainedLicense: {
          type: 'gold',
          isTrial: false,
          features: [{ name: 'cms-content-history', options: { retentionDays: 99999 } }],
        },
        features: { list: () => [], isEnabled: () => false },
        entitlements: { list: () => [] },
      },
    });
    stubUserServices();

    const data = (await adminController.licenseLimitInformation()).data as any;
    const contentHistory = data.planEntitlements.find(
      (entry: any) => entry.feature === 'cms-content-history'
    );
    expect(contentHistory.limits).toEqual([{ key: 'retentionDays', unit: 'days', value: null }]);
  });
});

describe('licenseLimitInformation (renewalDate)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('is null when absent', async () => {
    createStrapiMock({ stored: null, ee: { renewalDate: null } });
    stubUserServices();

    const data = (await adminController.licenseLimitInformation()).data as any;
    expect(data.renewalDate).toBeNull();
  });

  it('is echoed when present', async () => {
    createStrapiMock({ stored: null, ee: { renewalDate: '2027-01-01T00:00:00.000Z' } });
    stubUserServices();

    const data = (await adminController.licenseLimitInformation()).data as any;
    expect(data.renewalDate).toBe('2027-01-01T00:00:00.000Z');
  });
});
