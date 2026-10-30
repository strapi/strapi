import { describe, test, expect, vi } from 'vitest';
import { emitAudit } from '@strapi/utils';
import userService from '../user';
import constants from '../../../../../server/src/services/constants';

vi.mock('@strapi/utils', async () => ({
  ...(await vi.importActual<typeof import('@strapi/utils')>('@strapi/utils')),
  emitAudit: vi.fn(),
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
    const findOne = vi.fn(() => Promise.resolve(previous));
    const update = vi.fn(() => Promise.resolve(updated));
    const del = vi.fn(() => Promise.resolve(deleted));
    const count = vi.fn(() => Promise.resolve(0));

    global.strapi = {
      eventHub: { emit: vi.fn() },
      db: { query: () => ({ findOne, update, delete: del, count }) },
      store: { set: vi.fn() },
      // The unit setup resolves strapi.service('admin::x') from admin.services.x
      admin: {
        services: {
          auth: { hashPassword: vi.fn(() => Promise.resolve('hash')) },
          role: {
            getSuperAdminWithUsersCount: vi.fn(() => Promise.resolve({ id: 9, usersCount: 2 })),
          },
          'seat-enforcement': { getDisabledUserList: vi.fn(() => Promise.resolve(null)) },
        },
      },
    } as any;
    vi.mocked(emitAudit).mockClear();

    return { findOne, update, del };
  };

  const auditActions = () => vi.mocked(emitAudit).mock.calls.map((call) => call[1]);

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
    expect(JSON.stringify(vi.mocked(emitAudit).mock.calls)).not.toMatch(/Secret1234|hash/);
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

    expect(vi.mocked(emitAudit).mock.calls.map((call) => call[2])).toEqual([
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
    const findOne = vi.fn(() => Promise.resolve(superAdminUser));
    const update = vi.fn(() => Promise.resolve(superAdminUser));
    const count = vi.fn(() => Promise.resolve(0));
    const deleteFn = vi.fn(() => Promise.resolve(superAdminUser));
    const getSuperAdminWithUsersCount = vi.fn(() => Promise.resolve(null));

    global.strapi = {
      eventHub: { emit: vi.fn() },
      db: { query: () => ({ findOne, update, count, delete: deleteFn }) },
      store: { set: vi.fn() },
      admin: {
        services: {
          role: { getSuperAdminWithUsersCount },
          'seat-enforcement': { getDisabledUserList: vi.fn(() => Promise.resolve(null)) },
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
