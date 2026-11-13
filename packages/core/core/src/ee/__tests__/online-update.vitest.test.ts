/**
 * Covers what `onlineUpdate` sends to and keeps from the license registry beyond the license
 * itself. Same module-reset dance as license-retention.vitest.test.ts: the license state is a
 * closure singleton, so each test re-imports the module fresh.
 */

import { describe, it, expect, vi, afterEach, type Mock } from 'vitest';

vi.mock('../license', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../license')>()),
  readLicense: vi.fn(),
  verifyLicense: vi.fn(),
  fetchLicense: vi.fn(),
  fetchLicenseUsage: vi.fn(),
}));

type LicenseModuleMock = {
  readLicense: Mock;
  verifyLicense: Mock;
  fetchLicense: Mock;
  fetchLicenseUsage: Mock;
};

type EEModule = typeof import('../index').default;

const LICENSE_KEY = 'a-license-key';

const GOLD_LICENSE_INFO = {
  type: 'gold',
  isTrial: false,
  seats: 10,
  expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  features: [{ name: 'sso' }],
  licenseKey: LICENSE_KEY,
};

const createChainableDb = (storedRow: unknown) => {
  const chainable: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        if (prop === 'execute') {
          return vi
            .fn()
            .mockResolvedValue(storedRow ? { value: JSON.stringify(storedRow) } : undefined);
        }
        return () => chainable;
      },
    }
  );
  return chainable;
};

const createMockStrapi = ({
  users = [] as Array<{ email: string }>,
  findManyError,
  storedRow = null as unknown,
}: {
  users?: Array<{ email: string }>;
  findManyError?: Error;
  storedRow?: unknown;
} = {}) => {
  const findMany = findManyError
    ? vi.fn().mockRejectedValue(findManyError)
    : vi.fn().mockResolvedValue(users);

  const strapi = {
    eventHub: { emit: vi.fn() },
    log: { warn: vi.fn(), debug: vi.fn() },
    db: {
      transaction: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue({}),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      }),
      queryBuilder: vi.fn().mockImplementation(() => createChainableDb(storedRow)),
      query: vi.fn().mockReturnValue({ findMany }),
    },
    store: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) },
    config: { get: vi.fn().mockReturnValue('project-uuid') },
    cron: { add: vi.fn() },
  };

  return strapi as any;
};

const setup = async (strapiOptions?: Parameters<typeof createMockStrapi>[0]) => {
  vi.resetModules();
  const strapi = createMockStrapi(strapiOptions);
  (global as any).strapi = strapi;

  const license = (await import('../license')) as unknown as LicenseModuleMock;
  license.readLicense.mockReset().mockReturnValue('raw-license');
  license.verifyLicense.mockReset().mockReturnValue({ ...GOLD_LICENSE_INFO });
  license.fetchLicense.mockReset().mockResolvedValue('fresh-license');
  license.fetchLicenseUsage.mockReset().mockResolvedValue(null);

  delete process.env.STRAPI_LICENSE;
  delete process.env.STRAPI_DISABLE_EE;
  delete process.env.STRAPI_DISABLE_LICENSE_PING;

  const eeModule: EEModule = (await import('../index')).default;
  eeModule.init('/fake/license/dir');

  return { strapi, license, eeModule };
};

afterEach(() => {
  delete (global as any).strapi;
  delete process.env.STRAPI_DISABLE_LICENSE_PING;
});

describe('onlineUpdate user hashes', () => {
  it('sends the hashes of the active admin users with the license check', async () => {
    const { strapi, license, eeModule } = await setup({
      users: [{ email: 'a@example.com' }, { email: 'A@example.com' }],
    });
    const { hashAdminEmail } = await import('../user-hashes');

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicense).toHaveBeenCalledWith({ strapi }, LICENSE_KEY, 'project-uuid', {
      userHashes: [hashAdminEmail(LICENSE_KEY, 'a@example.com')],
    });
  });

  it('still sends the license check, without hashes, when they cannot be computed', async () => {
    const { strapi, license, eeModule } = await setup({ findManyError: new Error('db down') });

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicense).toHaveBeenCalledWith({ strapi }, LICENSE_KEY, 'project-uuid', {
      userHashes: undefined,
    });
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('db down'));
    expect(eeModule.isEE).toBe(true);
  });

  it('does not read the admin users for an offline license', async () => {
    const { strapi, license, eeModule } = await setup();
    process.env.STRAPI_DISABLE_LICENSE_PING = 'true';

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicense).not.toHaveBeenCalled();
    expect(strapi.db.query).not.toHaveBeenCalled();
  });
});

describe('onlineUpdate license usage', () => {
  const USAGE = { activeUsers: 12, contractedUsers: 10, updatedAt: '2026-11-13T10:00:00.000Z' };

  it('stores the usage after a license check the registry answered', async () => {
    const { strapi, license, eeModule } = await setup();
    license.fetchLicenseUsage.mockResolvedValue(USAGE);

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicenseUsage).toHaveBeenCalledWith({ strapi }, LICENSE_KEY);
    expect(strapi.store.set).toHaveBeenCalledWith({
      type: 'ee',
      key: 'license_usage',
      value: USAGE,
    });
    // After the license transaction, never inside it
    const commit = (await strapi.db.transaction.mock.results[0].value).commit;
    expect(commit.mock.invocationCallOrder[0]).toBeLessThan(
      license.fetchLicenseUsage.mock.invocationCallOrder[0]
    );
  });

  it('keeps the stored usage when the registry has none to give', async () => {
    const { strapi, license, eeModule } = await setup();
    license.fetchLicenseUsage.mockResolvedValue(null);

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicenseUsage).toHaveBeenCalled();
    expect(strapi.store.set).not.toHaveBeenCalled();
    expect(eeModule.isEE).toBe(true);
  });

  it('does not affect the license when storing the usage fails', async () => {
    const { strapi, license, eeModule } = await setup();
    license.fetchLicenseUsage.mockResolvedValue(USAGE);
    strapi.store.set.mockRejectedValue(new Error('db down'));

    await expect(eeModule.checkLicense({ strapi })).resolves.toBeUndefined();

    expect(eeModule.isEE).toBe(true);
  });

  it('is not fetched when the license check fell back', async () => {
    const { strapi, license, eeModule } = await setup({
      storedRow: { license: 'cached-license', lastCheckAt: 0 },
    });
    const { LicenseCheckError } = await import('../license');
    license.fetchLicense.mockRejectedValue(new LicenseCheckError('unreachable', true));

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicenseUsage).not.toHaveBeenCalled();
  });

  it('is not fetched when the registry rejected the license', async () => {
    const { strapi, license, eeModule } = await setup();
    const { LicenseCheckError } = await import('../license');
    license.fetchLicense.mockRejectedValue(new LicenseCheckError('Invalid key.'));

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicenseUsage).not.toHaveBeenCalled();
  });

  it('is not fetched when the registry was checked less than a minute ago', async () => {
    const { strapi, license, eeModule } = await setup({
      storedRow: { license: 'cached-license', lastCheckAt: Date.now() },
    });

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicense).not.toHaveBeenCalled();
    expect(license.fetchLicenseUsage).not.toHaveBeenCalled();
  });

  it('is not fetched for an offline license', async () => {
    const { strapi, license, eeModule } = await setup();
    process.env.STRAPI_DISABLE_LICENSE_PING = 'true';

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicenseUsage).not.toHaveBeenCalled();
    expect(strapi.store.set).not.toHaveBeenCalled();
  });
});
