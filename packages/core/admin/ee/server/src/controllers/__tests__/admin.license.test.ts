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

  it('computes nextRegistrySyncAt as lastCheckAt + 12h when online', async () => {
    const lastCheckAt = 1700000000000;
    createStrapiMock({
      stored: { value: JSON.stringify({ license: 'signed', lastCheckAt }) },
    });
    (global.strapi as any).service = () => ({
      getCurrentActiveUserCount: async () => 3,
      getDisabledUserList: async () => [],
    });

    const data = (await adminController.licenseLimitInformation()).data as any;
    expect(data.licenseMode).toBe('online');
    expect(data.nextRegistrySyncAt).toBe(lastCheckAt + 12 * 60 * 60 * 1000);
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
