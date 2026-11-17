import { describe, test, expect, vi } from 'vitest';

import { registerModelHooks } from '../bootstrap';

const setup = ({ mfaEnabled = true, previous = { id: 1, roles: [] } as unknown } = {}) => {
  const subscribers: Array<{ models: string[]; [hook: string]: unknown }> = [];
  const mfa = {
    isEnabled: vi.fn(() => mfaEnabled),
    purgeUser: vi.fn(() => Promise.resolve()),
    clearGraceIfStale: vi.fn(() => Promise.resolve()),
    revokeAllTrustedDevices: vi.fn(() => Promise.resolve(0)),
    clearTrustedDevices: vi.fn(() => Promise.resolve(0)),
  };
  const findOne = vi.fn(() => Promise.resolve(previous));

  global.strapi = {
    db: {
      lifecycles: { subscribe: vi.fn((subscriber) => subscribers.push(subscriber)) },
      query: vi.fn(() => ({ findOne })),
    },
    admin: {
      services: {
        mfa,
        metrics: { sendDidChangeInterfaceLanguage: vi.fn() },
        'api-token-admin': {
          deleteTokensForUser: vi.fn(() => Promise.resolve()),
          syncPermissionsForUser: vi.fn(() => Promise.resolve()),
        },
      },
    },
  } as any;

  registerModelHooks();
  const hooks = subscribers.find((s) => s.models.includes('admin::user')) as Record<
    string,
    (event: unknown) => Promise<void>
  >;

  return { hooks, mfa, findOne };
};

describe('admin::user lifecycles: two-factor cleanup', () => {
  test('deleting a user purges their two-factor rows', async () => {
    const { hooks, mfa } = setup();

    await hooks.beforeDelete({ params: { where: { id: 7 } } });

    expect(mfa.purgeUser).toHaveBeenCalledWith('7');
  });

  test('a role change hands the row with its old roles to clearGraceIfStale', async () => {
    const previous = { id: 7, roles: [{ id: 2 }], mfaGraceUntil: new Date(0) };
    const { hooks, mfa, findOne } = setup({ previous });

    await hooks.beforeUpdate({ params: { where: { id: 7 }, data: { roles: [3] } } });

    expect(findOne).toHaveBeenCalledWith({ where: { id: 7 }, populate: ['roles'] });
    expect(mfa.clearGraceIfStale).toHaveBeenCalledWith(previous);
  });

  test('an update without roles does not read the row', async () => {
    const { hooks, mfa, findOne } = setup();

    await hooks.beforeUpdate({ params: { where: { id: 7 }, data: { firstname: 'Kai' } } });

    expect(findOne).not.toHaveBeenCalled();
    expect(mfa.clearGraceIfStale).not.toHaveBeenCalled();
  });

  test.each([
    [true, 'revokeAllTrustedDevices'],
    [false, 'clearTrustedDevices'],
  ] as const)(
    'a password change drops the trusted devices (feature on: %s, via %s)',
    async (mfaEnabled, method) => {
      const { hooks, mfa } = setup({ mfaEnabled });

      await hooks.afterUpdate({
        params: { where: { id: 7 }, data: { password: 'hash' } },
        result: { id: 7 },
      });

      expect(mfa[method]).toHaveBeenCalledWith('7');
    }
  );

  test('an update without a password keeps the trusted devices', async () => {
    const { hooks, mfa } = setup();

    await hooks.afterUpdate({
      params: { where: { id: 7 }, data: { firstname: 'Kai' } },
      result: { id: 7 },
    });

    expect(mfa.revokeAllTrustedDevices).not.toHaveBeenCalled();
    expect(mfa.clearTrustedDevices).not.toHaveBeenCalled();
  });
});
