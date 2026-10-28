import { emitAudit } from '@strapi/utils';
import userService from '../user';
import constants from '../../../../../server/src/services/constants';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

const { updateById, deleteById, deleteByIds } = userService;
const { SUPER_ADMIN_CODE } = constants;

describe('EE user service audit events', () => {
  const editorRole = { id: 2, code: 'strapi-editor' };
  const previous = {
    id: 1,
    email: 'test@strapi.io',
    firstname: 'Kai',
    isActive: true,
    roles: [editorRole],
  };

  const setup = ({
    updated = previous,
    deleted = previous,
  }: { updated?: Record<string, unknown>; deleted?: Record<string, unknown> } = {}) => {
    const findOne = jest.fn(() => Promise.resolve(previous));
    const update = jest.fn(() => Promise.resolve(updated));
    const del = jest.fn(() => Promise.resolve(deleted));
    const count = jest.fn(() => Promise.resolve(0));

    global.strapi = {
      eventHub: { emit: jest.fn() },
      db: { query: () => ({ findOne, update, delete: del, count }) },
      store: { set: jest.fn() },
      // The unit setup resolves strapi.service('admin::x') from admin.services.x
      admin: {
        services: {
          auth: { hashPassword: jest.fn(() => Promise.resolve('hash')) },
          role: {
            getSuperAdminWithUsersCount: jest.fn(() => Promise.resolve({ id: 9, usersCount: 2 })),
          },
          // The delete paths purge the account's MFA material before removing the row.
          mfa: { purgeUser: jest.fn(() => Promise.resolve()) },
          'seat-enforcement': { getDisabledUserList: jest.fn(() => Promise.resolve(null)) },
        },
      },
    } as any;
    jest.mocked(emitAudit).mockClear();

    return { findOne, update, del };
  };

  const auditActions = () => jest.mocked(emitAudit).mock.calls.map((call) => call[1]);

  test('updateById records the changed fields and still emits the legacy user.update', async () => {
    const { findOne } = setup({ updated: { ...previous, isActive: false } });

    await updateById(1, { isActive: false });

    expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
    expect(emitAudit).toHaveBeenCalledWith({ strapi: global.strapi }, 'admin-user.update', {
      userId: 1,
      email: 'test@strapi.io',
      changes: { isActive: { before: true, after: false } },
    });
    expect(global.strapi.eventHub.emit).toHaveBeenCalledWith(
      'user.update',
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) })
    );
  });

  test('updateById records nothing when no tracked field changed', async () => {
    setup();

    await updateById(1, { firstname: 'Kai' });

    expect(emitAudit).not.toHaveBeenCalled();
  });

  test('updateById records a password change without the hash', async () => {
    const { findOne } = setup({ updated: { ...previous, password: 'hash' } });

    await updateById(1, { password: 'Secret1234' });

    expect(findOne).not.toHaveBeenCalled();
    expect(auditActions()).toEqual(['admin-user.password.update']);
    expect(JSON.stringify(jest.mocked(emitAudit).mock.calls)).not.toMatch(/Secret1234|hash/);
  });

  test('deleteById records the deleted account', async () => {
    setup();

    await deleteById(1);

    expect(emitAudit).toHaveBeenCalledWith({ strapi: global.strapi }, 'admin-user.delete', {
      userId: 1,
      email: 'test@strapi.io',
    });
    expect(global.strapi.eventHub.emit).toHaveBeenCalledWith(
      'user.delete',
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) })
    );
  });

  test('deleteByIds records one row per account', async () => {
    const { del } = setup();
    del
      .mockResolvedValueOnce({ id: 1, email: 'a@strapi.io', roles: [] })
      .mockResolvedValueOnce({ id: 2, email: 'b@strapi.io', roles: [] });

    await deleteByIds([1, 2]);

    expect(jest.mocked(emitAudit).mock.calls.map((call) => call[2])).toEqual([
      { userId: 1, email: 'a@strapi.io' },
      { userId: 2, email: 'b@strapi.io' },
    ]);
    expect(auditActions()).toEqual(['admin-user.delete', 'admin-user.delete']);
    expect(global.strapi.eventHub.emit).toHaveBeenCalledWith(
      'user.delete',
      expect.objectContaining({ users: expect.any(Array) })
    );
  });
});

const setStrapi = (value: object) => {
  (globalThis as any).strapi = value;
};

describe('EE user service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('deleteById emits user.delete without any MFA column', async () => {
    const deletedUser = {
      id: 3,
      email: 'kai@doe.com',
      password: 'hashed',
      roles: [{ id: 2, code: 'strapi-editor', name: 'Editor' }],
      mfaSecret: 'encrypted-secret-ciphertext',
      mfaEnabledAt: '2026-01-01T00:00:00.000Z',
      mfaLastUsedStep: 42,
      mfaPendingSecret: 'encrypted-pending-ciphertext',
      mfaGraceUntil: '2026-09-11T00:00:00.000Z',
      mfaLockedAt: null,
      mfaPasskeyChallenge: 'pending-ceremony-challenge',
      mfaPasskeyChallengeExpiresAt: '2026-09-09T00:05:00.000Z',
    };
    const emit = jest.fn();
    const findOne = jest.fn(() => Promise.resolve(deletedUser));
    const del = jest.fn(() => Promise.resolve(deletedUser));
    const storeGet = jest.fn(() => Promise.resolve(null));
    const storeSet = jest.fn(() => Promise.resolve());

    setStrapi({
      eventHub: { emit },
      db: { query: jest.fn(() => ({ findOne, delete: del })) },
      store: jest.fn(() => ({ get: storeGet, set: storeSet })),
      sessionManager: Object.assign(jest.fn(), { hasOrigin: jest.fn(() => false) }),
      admin: {
        services: {
          role: { getSuperAdminWithUsersCount: jest.fn() },
          mfa: { purgeUser: jest.fn(() => Promise.resolve()) },
          // `removeFromEEDisabledUsersList` resolves this via `strapi.service('admin::seat-enforcement')`
          // (see `tests/setup/unit.setup.js`, which routes `strapi.service` through
          // `strapi.admin.services`). Returning a falsy list short-circuits it before it ever
          // reaches `strapi.store`, keeping the `store` double above genuinely unused.
          'seat-enforcement': { getDisabledUserList: jest.fn(() => Promise.resolve(null)) },
        },
      },
    });

    await userService.deleteById(3);

    expect(emit).toHaveBeenCalledWith('user.delete', { user: expect.any(Object) });
    const payload = emit.mock.calls[0][1].user;
    expect(payload).not.toHaveProperty('password');
    for (const column of [
      'mfaSecret',
      'mfaEnabledAt',
      'mfaLastUsedStep',
      'mfaPendingSecret',
      'mfaGraceUntil',
      'mfaLockedAt',
      'mfaPasskeyChallenge',
      'mfaPasskeyChallengeExpiresAt',
    ]) {
      expect(payload).not.toHaveProperty(column);
    }
    expect(payload.roles).toEqual([{ id: 2, code: 'strapi-editor', name: 'Editor' }]);
  });

  /**
   * These functions shadow their CE namesakes (`server/src/index.ts` merges EE over CE), so the
   * CE suite's ordering assertions prove nothing about an EE build -- the only kind the paying
   * base runs. Without the purge, deleting an admin strands recovery-code hashes, trusted-device
   * tokens, passkey keys and the whole notice history against an id that no longer resolves.
   */
  describe('mfa purge on delete', () => {
    const editor = { id: 3, email: 'kai@doe.com', roles: [{ id: 2, code: 'strapi-editor' }] };

    const buildStrapi = ({
      user = editor,
      superAdminUsersCount = 2,
      superAdminsToDelete = 0,
    }: {
      user?: Record<string, unknown>;
      superAdminUsersCount?: number;
      superAdminsToDelete?: number;
    } = {}) => {
      const purgeUser = jest.fn(() => Promise.resolve());
      const del = jest.fn(() => Promise.resolve(user));
      const findOne = jest.fn(() => Promise.resolve(user));
      const count = jest.fn(() => Promise.resolve(superAdminsToDelete));
      const getSuperAdminWithUsersCount = jest.fn(() =>
        Promise.resolve({ id: 9, usersCount: superAdminUsersCount })
      );

      setStrapi({
        eventHub: { emit: jest.fn() },
        db: { query: jest.fn(() => ({ findOne, delete: del, count })) },
        store: jest.fn(() => ({ get: jest.fn(), set: jest.fn() })),
        sessionManager: Object.assign(jest.fn(), { hasOrigin: jest.fn(() => false) }),
        admin: {
          services: {
            role: { getSuperAdminWithUsersCount },
            mfa: { purgeUser },
            'seat-enforcement': { getDisabledUserList: jest.fn(() => Promise.resolve(null)) },
          },
        },
      });

      return { purgeUser, del, getSuperAdminWithUsersCount };
    };

    test('deleteById purges after the super-admin guard and before the row delete', async () => {
      const { purgeUser, del, getSuperAdminWithUsersCount } = buildStrapi();

      await userService.deleteById(3);

      expect(purgeUser).toHaveBeenCalledWith('3');
      expect(getSuperAdminWithUsersCount.mock.invocationCallOrder[0] ?? -1).toBeLessThan(
        purgeUser.mock.invocationCallOrder[0]
      );
      expect(purgeUser.mock.invocationCallOrder[0]).toBeLessThan(del.mock.invocationCallOrder[0]);
    });

    test("a refused deletion leaves the live user's second factor alone", async () => {
      const { purgeUser, del } = buildStrapi({
        user: { id: 3, email: 'kai@doe.com', roles: [{ id: 1, code: 'strapi-super-admin' }] },
        superAdminUsersCount: 1,
      });

      await expect(userService.deleteById(3)).rejects.toThrow(
        'You must have at least one user with super admin role.'
      );

      expect(purgeUser).not.toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
    });

    test('deleteByIds purges each account before that account is deleted', async () => {
      const { purgeUser, del } = buildStrapi();

      await userService.deleteByIds([3, 4]);

      expect(purgeUser.mock.calls).toEqual([['3'], ['4']]);
      expect(purgeUser.mock.invocationCallOrder[0]).toBeLessThan(del.mock.invocationCallOrder[0]);
      expect(purgeUser.mock.invocationCallOrder[1]).toBeLessThan(del.mock.invocationCallOrder[1]);
    });
  });
});

describe('EE user service without a super admin role', () => {
  const superAdminUser = { id: 2, email: 'test@strapi.io', roles: [{ code: SUPER_ADMIN_CODE }] };
  const missingRoleMessage = "Cannot proceed because the super admin role doesn't exist.";

  const setup = () => {
    const findOne = jest.fn(() => Promise.resolve(superAdminUser));
    const update = jest.fn(() => Promise.resolve(superAdminUser));
    const count = jest.fn(() => Promise.resolve(0));
    const deleteFn = jest.fn(() => Promise.resolve(superAdminUser));
    const getSuperAdminWithUsersCount = jest.fn(() => Promise.resolve(null));

    global.strapi = {
      eventHub: { emit: jest.fn() },
      db: { query: () => ({ findOne, update, count, delete: deleteFn }) },
      store: { set: jest.fn() },
      admin: {
        services: {
          role: { getSuperAdminWithUsersCount },
          'seat-enforcement': { getDisabledUserList: jest.fn(() => Promise.resolve(null)) },
        },
      },
    } as any;

    return { update, count, deleteFn };
  };

  test('updateById rejects a roles update with a clear error', async () => {
    const { update } = setup();

    await expect(updateById(superAdminUser.id, { roles: [3] })).rejects.toMatchObject({
      name: 'ApplicationError',
      message: missingRoleMessage,
    });
    expect(update).not.toHaveBeenCalled();
  });

  test('updateById can deactivate a user, who cannot be the last super admin', async () => {
    const { update } = setup();

    await updateById(superAdminUser.id, { isActive: false });

    expect(update).toHaveBeenCalledWith({
      where: { id: superAdminUser.id },
      data: { isActive: false },
      populate: ['roles'],
    });
  });

  test('deleteById rejects with a clear error', async () => {
    const { deleteFn } = setup();

    await expect(deleteById(superAdminUser.id)).rejects.toMatchObject({
      name: 'ApplicationError',
      message: missingRoleMessage,
    });
    expect(deleteFn).not.toHaveBeenCalled();
  });

  test('deleteByIds rejects with a clear error', async () => {
    const { count, deleteFn } = setup();

    await expect(deleteByIds([superAdminUser.id])).rejects.toMatchObject({
      name: 'ApplicationError',
      message: missingRoleMessage,
    });
    expect(count).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
  });
});
