import adminController from '../admin';

const createStrapiMock = (overrides: any = {}) => {
  const stored = overrides.stored ?? null;
  global.strapi = {
    EE: true,
    ee: {
      seats: 10,
      type: 'gold',
      isTrial: false,
      subscriptionId: 'sub_123',
      expireAt: '2026-12-31T00:00:00.000Z',
      features: { list: () => [{ name: 'sso' }] },
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
