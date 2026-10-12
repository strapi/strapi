import { emitAudit } from '@strapi/utils';
import userService from '../user';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

const { updateById, deleteById, deleteByIds } = userService;

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
