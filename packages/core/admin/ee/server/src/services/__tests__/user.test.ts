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
    found = previous,
    superAdminCount = 2,
    seats,
    disabledUsers = null,
  }: {
    updated?: Record<string, unknown> | null;
    deleted?: Record<string, unknown>;
    found?: Record<string, unknown> | null;
    superAdminCount?: number;
    seats?: number;
    disabledUsers?: Array<{ id: number; isActive: boolean }> | null;
  } = {}) => {
    const findOne = jest.fn(() => Promise.resolve(found));
    const update = jest.fn(() => Promise.resolve(updated));
    const del = jest.fn(() => Promise.resolve(deleted));
    const count = jest.fn(() => Promise.resolve(0));
    const getDisabledUserList = jest.fn(() => Promise.resolve(disabledUsers));

    global.strapi = {
      ee: {
        features: {
          isEnabled: jest.fn((name: string) => name === 'seat-limit' && seats !== undefined),
        },
      },
      eventHub: { emit: jest.fn() },
      db: { query: () => ({ findOne, update, delete: del, count }) },
      store: { set: jest.fn() },
      // The unit setup resolves strapi.service('admin::x') from admin.services.x
      admin: {
        services: {
          auth: { hashPassword: jest.fn(() => Promise.resolve('hash')) },
          role: {
            getSuperAdminWithUsersCount: jest.fn(() =>
              Promise.resolve({ id: 9, usersCount: superAdminCount })
            ),
          },
          'seat-enforcement': { getDisabledUserList },
        },
      },
    } as any;
    jest.mocked(emitAudit).mockClear();

    return { findOne, update, del, getDisabledUserList };
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

  describe('seat bookkeeping', () => {
    const disabledUsers = [
      { id: 1, isActive: true },
      { id: 3, isActive: true },
    ];

    test('leaves the disabled users list alone without a seat limit', async () => {
      const { getDisabledUserList } = setup({ disabledUsers });

      await updateById(1, { isActive: false });
      await deleteById(1);
      await deleteByIds([1]);

      expect(getDisabledUserList).not.toHaveBeenCalled();
      expect(global.strapi.store.set).not.toHaveBeenCalled();
    });

    test('removes a deleted user from the disabled users list with a seat limit', async () => {
      setup({ seats: 5, disabledUsers });

      await deleteById(1);

      expect(global.strapi.store.set).toHaveBeenCalledWith({
        type: 'ee',
        key: 'disabled_users',
        value: [{ id: 3, isActive: true }],
      });
    });

    test('removes deleted users from the disabled users list with a seat limit', async () => {
      setup({ seats: 5, disabledUsers });

      await deleteByIds([1, 3]);

      expect(global.strapi.store.set).toHaveBeenCalledWith({
        type: 'ee',
        key: 'disabled_users',
        value: [],
      });
    });

    test.each([
      ['an update', { isActive: false }],
      ['a password update', { isActive: false, password: 'Secret1234' }],
    ])(
      'removes a listed user whose isActive changes in %s with a seat limit',
      async (_label, attributes) => {
        setup({ seats: 5, disabledUsers });

        await updateById(1, attributes);

        expect(global.strapi.store.set).toHaveBeenCalledWith({
          type: 'ee',
          key: 'disabled_users',
          value: [{ id: 3, isActive: true }],
        });
      }
    );
  });

  test.each([{ isActive: false }, { roles: ['2'] }])(
    'updateById resolves to null for an unknown user with one super admin (%o)',
    async (attributes) => {
      setup({ found: null, updated: null, superAdminCount: 1 });

      await expect(updateById(99, attributes)).resolves.toBeNull();
    }
  );
});
