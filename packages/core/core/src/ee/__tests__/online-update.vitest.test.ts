/**
 * Covers the admin users report that follows the license check. Same module-reset dance as license-retention.vitest.test.ts: the license state is a
 * closure singleton, so each test re-imports the module fresh.
 */

import { describe, it, expect, vi, afterEach, type Mock } from 'vitest';

vi.mock('../license', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../license')>()),
  readLicense: vi.fn(),
  verifyLicense: vi.fn(),
  fetchLicense: vi.fn(),
  reportAdminUsers: vi.fn(),
}));

type LicenseModuleMock = {
  readLicense: Mock;
  verifyLicense: Mock;
  fetchLicense: Mock;
  reportAdminUsers: Mock;
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
      lifecycles: { subscribe: vi.fn() },
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
  license.reportAdminUsers.mockReset().mockResolvedValue(null);

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

const COUNT = { activeUsers: 12, contractedUsers: 10, updatedAt: '2026-11-13T10:00:00.000Z' };

describe('admin users report after the license check', () => {
  it('reports the hashed active admin users and stores the count', async () => {
    const { strapi, license, eeModule } = await setup({
      users: [{ email: 'a@example.com' }, { email: 'A@example.com' }],
    });
    license.reportAdminUsers.mockResolvedValue(COUNT);
    const { hashAdminEmail } = await import('../user-hashes');

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicense).toHaveBeenCalledWith({ strapi }, LICENSE_KEY, 'project-uuid');
    await vi.waitFor(() =>
      expect(strapi.store.set).toHaveBeenCalledWith({
        type: 'ee',
        key: 'admin_users_across_instances',
        value: COUNT,
      })
    );
    expect(license.reportAdminUsers).toHaveBeenCalledWith({ strapi }, LICENSE_KEY, [
      hashAdminEmail(LICENSE_KEY, 'a@example.com'),
    ]);
  });

  it('does not delay the license check', async () => {
    const { strapi, license, eeModule } = await setup();
    license.reportAdminUsers.mockReturnValue(new Promise(() => {}));

    await expect(eeModule.checkLicense({ strapi })).resolves.toBeUndefined();

    expect(eeModule.isEE).toBe(true);
  });

  it('keeps the stored count when the registry has none to give', async () => {
    const { strapi, license, eeModule } = await setup();

    await eeModule.checkLicense({ strapi });

    await vi.waitFor(() => expect(license.reportAdminUsers).toHaveBeenCalled());
    expect(strapi.store.set).not.toHaveBeenCalled();
  });

  it('does not report when the admin users cannot be read', async () => {
    const { strapi, license, eeModule } = await setup({ findManyError: new Error('db down') });

    await eeModule.checkLicense({ strapi });

    await vi.waitFor(() =>
      expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('db down'))
    );
    expect(license.reportAdminUsers).not.toHaveBeenCalled();
    expect(eeModule.isEE).toBe(true);
  });

  it('does not report when the license check fell back', async () => {
    const { strapi, license, eeModule } = await setup({
      storedRow: { license: 'cached-license', lastCheckAt: 0 },
    });
    const { LicenseCheckError } = await import('../license');
    license.fetchLicense.mockRejectedValue(new LicenseCheckError('unreachable', true));

    await eeModule.checkLicense({ strapi });

    expect(strapi.db.query).not.toHaveBeenCalled();
    expect(license.reportAdminUsers).not.toHaveBeenCalled();
  });

  it('does not report when the registry rejected the license', async () => {
    const { strapi, license, eeModule } = await setup();
    const { LicenseCheckError } = await import('../license');
    license.fetchLicense.mockRejectedValue(new LicenseCheckError('Invalid key.'));

    await eeModule.checkLicense({ strapi });

    expect(license.reportAdminUsers).not.toHaveBeenCalled();
  });

  it('does not report when the registry was checked less than a minute ago', async () => {
    const { strapi, license, eeModule } = await setup({
      storedRow: { license: 'cached-license', lastCheckAt: Date.now() },
    });

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicense).not.toHaveBeenCalled();
    expect(license.reportAdminUsers).not.toHaveBeenCalled();
  });

  it('does not report for an offline license', async () => {
    const { strapi, license, eeModule } = await setup();
    process.env.STRAPI_DISABLE_LICENSE_PING = 'true';

    await eeModule.checkLicense({ strapi });

    expect(license.fetchLicense).not.toHaveBeenCalled();
    expect(license.reportAdminUsers).not.toHaveBeenCalled();
    expect(strapi.db.lifecycles.subscribe).not.toHaveBeenCalled();
  });
});

describe('admin users report after an admin user change', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const subscribed = (strapi: any) => strapi.db.lifecycles.subscribe.mock.calls[0][0];

  it('reports 10 seconds after an admin user is created, deactivated or deleted', async () => {
    const { strapi, license, eeModule } = await setup();
    await eeModule.checkLicense({ strapi });
    await vi.waitFor(() => expect(license.reportAdminUsers).toHaveBeenCalledTimes(1));
    vi.useFakeTimers();

    const hooks = subscribed(strapi);
    expect(hooks.models).toEqual(['admin::user']);
    hooks.afterCreate({ params: {} });
    hooks.afterUpdate({ params: { data: { isActive: false } } });
    hooks.afterDelete({ params: {} });

    await vi.advanceTimersByTimeAsync(9_000);
    expect(license.reportAdminUsers).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(license.reportAdminUsers).toHaveBeenCalledTimes(2);
  });

  it('stops reporting once the registry rejects the license', async () => {
    const { strapi, license, eeModule } = await setup();
    const { LicenseCheckError } = await import('../license');
    await eeModule.checkLicense({ strapi });
    await vi.waitFor(() => expect(license.reportAdminUsers).toHaveBeenCalledTimes(1));

    // The next 12-hour check: the subscription was cancelled in the meantime
    license.fetchLicense.mockRejectedValue(new LicenseCheckError('Subscription cancelled.'));
    await strapi.cron.add.mock.calls[0][0].onlineUpdate.task();
    vi.useFakeTimers();

    subscribed(strapi).afterCreate({ params: {} });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(license.reportAdminUsers).toHaveBeenCalledTimes(1);
  });

  it('ignores updates that change neither the status nor the email', async () => {
    const { strapi, license, eeModule } = await setup();
    await eeModule.checkLicense({ strapi });
    await vi.waitFor(() => expect(license.reportAdminUsers).toHaveBeenCalledTimes(1));
    vi.useFakeTimers();

    subscribed(strapi).afterUpdate({ params: { data: { firstname: 'Ada' } } });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(license.reportAdminUsers).toHaveBeenCalledTimes(1);
  });
});
