/* eslint-disable @typescript-eslint/no-var-requires, node/no-missing-require */
/**
 * Covers the display-only license retention added to `disable()`/`enable()`.
 *
 * These tests drive the real `init()` / `checkLicense()` / `validateInfo()` flow (rather
 * than calling internal functions directly, since only the frozen default export is
 * exposed) so the licensing guarantee is exercised end-to-end: an expired/unusable
 * license must still grant nothing, even though its display info is now retained.
 *
 * The module keeps its license state in a closure singleton (guarded by an `initialized`
 * flag), so each test resets the module registry and re-requires it fresh via `require()`
 * (dynamic `require` is needed here, not a static `import`, since we need a *new* module
 * instance per test rather than the one cached at import-time).
 */

jest.mock('../license', () => ({
  ...jest.requireActual('../license'),
  readLicense: jest.fn(),
  verifyLicense: jest.fn(),
  fetchLicense: jest.fn(),
}));

type LicenseModuleMock = {
  readLicense: jest.Mock;
  verifyLicense: jest.Mock;
  fetchLicense: jest.Mock;
};

type EEModule = typeof import('../index').default;

const GOLD_LICENSE_INFO = {
  type: 'gold',
  isTrial: false,
  seats: 10,
  subscriptionId: 'sub_123',
  planPriceId: 'price_123',
  features: [{ name: 'sso' }],
  // Real `verifyLicense` never sets this, but the field exists on the shared type and
  // `disable()` must strip it from the retained snapshot regardless of where it came from.
  licenseKey: 'super-secret-license-key',
};

// A no-op chainable query-builder double: every property access returns a function that
// returns the same proxy (so `.where().select().first()...` chains keep working), except
// `execute`, which resolves the shared mock so callers can assert on/configure it.
const createChainableDb = () => {
  const execute = jest.fn().mockResolvedValue(undefined);
  const chainable: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'execute') return execute;
        if (prop === 'then') return undefined;
        return () => chainable;
      },
    }
  );
  return { chainable, execute };
};

const createMockStrapi = () => {
  const emit = jest.fn();
  const { chainable } = createChainableDb();

  const strapi = {
    eventHub: { emit },
    db: {
      transaction: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue({}),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      }),
      queryBuilder: jest.fn().mockReturnValue(chainable),
    },
    config: { get: jest.fn().mockReturnValue('project-uuid') },
    cron: { add: jest.fn() },
  };

  return strapi as any;
};

describe('ee license retention', () => {
  let eeModule: EEModule;
  let license: LicenseModuleMock;
  let mockStrapi: ReturnType<typeof createMockStrapi>;

  beforeEach(() => {
    jest.resetModules();

    mockStrapi = createMockStrapi();
    (global as any).strapi = mockStrapi;

    license = jest.requireMock('../license') as LicenseModuleMock;
    license.readLicense.mockReset();
    license.verifyLicense.mockReset();
    license.fetchLicense.mockReset();

    delete process.env.STRAPI_LICENSE;
    delete process.env.STRAPI_DISABLE_EE;
    delete process.env.STRAPI_DISABLE_LICENSE_PING;

    eeModule = require('../index').default;
  });

  afterEach(() => {
    delete (global as any).strapi;
    delete process.env.STRAPI_LICENSE;
    delete process.env.STRAPI_DISABLE_EE;
    delete process.env.STRAPI_DISABLE_LICENSE_PING;
  });

  it('expired license retains display data but grants nothing', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    process.env.STRAPI_LICENSE = 'fake-license-blob';
    license.verifyLicense.mockReturnValue({ ...GOLD_LICENSE_INFO, expireAt: past });

    eeModule.init('/fake/license/dir');

    // Sanity check: loading a (not-yet-validated-for-expiry) gold license enables EE.
    expect(eeModule.isEE).toBe(true);
    expect(eeModule.features.isEnabled('sso')).toBe(true);

    process.env.STRAPI_DISABLE_LICENSE_PING = 'true';
    await eeModule.checkLicense({ strapi: mockStrapi });

    expect(eeModule.licenseStatus).toBe('expired');
    expect(eeModule.retainedLicense?.type).toBe('gold');
    expect(eeModule.retainedLicense?.subscriptionId).toBe('sub_123');
    expect(eeModule.retainedLicense).not.toHaveProperty('licenseKey');

    // The licensing guarantee: an expired license must grant nothing, even though its
    // display info is retained.
    expect(eeModule.isEE).toBe(false);
    expect(eeModule.features.isEnabled('sso')).toBe(false);
    expect(eeModule.features.list()).toEqual([]);
  });

  it('a non-expiry failure sets licenseStatus to unknown', async () => {
    process.env.STRAPI_LICENSE = 'fake-license-blob';
    // No expireAt: a gold license without offline support info.
    license.verifyLicense.mockReturnValue({
      ...GOLD_LICENSE_INFO,
      expireAt: undefined,
    });

    eeModule.init('/fake/license/dir');
    expect(eeModule.isEE).toBe(true);

    process.env.STRAPI_DISABLE_LICENSE_PING = 'true';
    await eeModule.checkLicense({ strapi: mockStrapi });

    expect(eeModule.licenseStatus).toBe('unknown');
    expect(eeModule.retainedLicense?.type).toBe('gold');
    expect(eeModule.isEE).toBe(false);
    expect(eeModule.features.isEnabled('sso')).toBe(false);
  });

  it('enable() clears a previously retained snapshot', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    process.env.STRAPI_LICENSE = 'fake-license-blob';
    license.verifyLicense.mockReturnValue({ ...GOLD_LICENSE_INFO, expireAt: past });

    eeModule.init('/fake/license/dir');

    process.env.STRAPI_DISABLE_LICENSE_PING = 'true';
    await eeModule.checkLicense({ strapi: mockStrapi });

    // Pre-condition: the expiry disable() above retained a snapshot.
    expect(eeModule.licenseStatus).toBe('expired');
    expect(eeModule.retainedLicense).not.toBeNull();

    // Simulate the license registry now reporting a renewed, non-expired license. Once
    // `disable()` wipes `licenseInfo.type`, `checkLicense` no longer qualifies for the
    // offline branch, so this naturally goes through the online (`onlineUpdate`) path.
    delete process.env.STRAPI_DISABLE_LICENSE_PING;
    license.fetchLicense.mockResolvedValue('renewed-license-blob');
    license.verifyLicense.mockReturnValue({ ...GOLD_LICENSE_INFO, expireAt: future });

    await eeModule.checkLicense({ strapi: mockStrapi });

    expect(eeModule.licenseStatus).toBe('active');
    expect(eeModule.retainedLicense).toBeNull();
    expect(eeModule.isEE).toBe(true);
  });

  it('a repeat disable() does not clobber the original snapshot', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

    process.env.STRAPI_LICENSE = 'fake-license-blob';
    license.verifyLicense.mockReturnValue({ ...GOLD_LICENSE_INFO, expireAt: past });

    eeModule.init('/fake/license/dir');

    process.env.STRAPI_DISABLE_LICENSE_PING = 'true';
    await eeModule.checkLicense({ strapi: mockStrapi });

    expect(eeModule.retainedLicense?.type).toBe('gold');
    expect(eeModule.retainedLicense?.subscriptionId).toBe('sub_123');

    // A second failure (e.g. the registry is unreachable on the next periodic check).
    // `licenseInfo.type` was already wiped by the first disable(), so this call must not
    // overwrite the retained snapshot with an already-wiped one.
    delete process.env.STRAPI_DISABLE_LICENSE_PING;
    license.fetchLicense.mockRejectedValue(new Error('network still down'));

    await eeModule.checkLicense({ strapi: mockStrapi });

    expect(eeModule.isEE).toBe(false);
    expect(eeModule.retainedLicense?.type).toBe('gold');
    expect(eeModule.retainedLicense?.subscriptionId).toBe('sub_123');
  });
});
