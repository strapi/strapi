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

describe('EE user service with a single super admin and an unknown user id', () => {
  const setup = () => {
    const findOne = jest.fn(() => Promise.resolve(null));
    const update = jest.fn(() => Promise.resolve(null));

    global.strapi = {
      eventHub: { emit: jest.fn() },
      db: { query: () => ({ findOne, update, count: jest.fn() }) },
      store: { set: jest.fn() },
      admin: {
        services: {
          role: {
            getSuperAdminWithUsersCount: jest.fn(() => Promise.resolve({ id: 9, usersCount: 1 })),
          },
          'seat-enforcement': { getDisabledUserList: jest.fn(() => Promise.resolve(null)) },
        },
      },
    } as any;

    return { update };
  };

  test('updateById resolves to null when deactivating a missing user', async () => {
    const { update } = setup();

    await expect(updateById(404, { isActive: false })).resolves.toBeNull();
    expect(update).toHaveBeenCalled();
  });

  test('updateById resolves to null when changing roles of a missing user', async () => {
    const { update } = setup();

    await expect(updateById(404, { roles: [3] })).resolves.toBeNull();
    expect(update).toHaveBeenCalled();
  });
});
