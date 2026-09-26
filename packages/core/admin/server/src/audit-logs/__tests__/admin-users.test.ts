import { emitAudit } from '@strapi/utils';

import {
  emitAdminUserCreated,
  emitAdminUserDeleted,
  emitAdminUserUpdateAudits,
  getAdminUserChanges,
  registerAdminUserAuditEvents,
  touchesTrackedFields,
} from '../admin-users';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

const getRegistrations = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};
  const options: Record<string, unknown> = {};

  registerAdminUserAuditEvents({
    registerEvent(name: string, transform: any, opts?: unknown) {
      transformers[name] = transform;
      options[name] = opts;
    },
  });

  return { transformers, options };
};

describe('admin-user audit events', () => {
  const user = { userId: 7, email: 'ana@acme.com' };
  const resource = { type: 'admin-user', id: 7, email: 'ana@acme.com' };

  test('registers the seven account events', () => {
    expect(Object.keys(getRegistrations().transformers).sort()).toEqual([
      'admin-user.create',
      'admin-user.delete',
      'admin-user.invite.accept',
      'admin-user.password-reset.confirm',
      'admin-user.password-reset.create',
      'admin-user.password.update',
      'admin-user.update',
    ]);
  });

  test('only the events raised from public forms allow an unknown actor', () => {
    const { options } = getRegistrations();

    expect(options).toEqual({
      'admin-user.create': { allowUnknownActor: true },
      'admin-user.password-reset.create': { allowUnknownActor: true },
      'admin-user.password-reset.confirm': { allowUnknownActor: true },
      'admin-user.invite.accept': { allowUnknownActor: true },
      'admin-user.update': undefined,
      'admin-user.delete': undefined,
      'admin-user.password.update': undefined,
    });
  });

  test('create records the fields that define the account', () => {
    const transform = getRegistrations().transformers['admin-user.create'];

    expect(
      transform({ ...user, firstname: 'Ana', lastname: null, roles: [1, 3], isActive: false })
    ).toEqual({
      resource,
      details: {
        email: 'ana@acme.com',
        firstname: 'Ana',
        lastname: null,
        roles: [1, 3],
        isActive: false,
      },
    });
  });

  test('update records the changes as emitted', () => {
    const transform = getRegistrations().transformers['admin-user.update'];
    const changes = { isActive: { before: true, after: false } };

    expect(transform({ ...user, changes })).toEqual({ resource, details: { changes } });
  });

  test('password-reset.create records the link expiry as an ISO date', () => {
    const transform = getRegistrations().transformers['admin-user.password-reset.create'];

    expect(transform({ ...user, expiresAt: new Date(1_800_000_000_000) })).toEqual({
      resource,
      details: { expiresAt: new Date(1_800_000_000_000).toISOString() },
    });
  });

  test.each([
    'admin-user.delete',
    'admin-user.password-reset.confirm',
    'admin-user.invite.accept',
    'admin-user.password.update',
  ])('%s records the account only', (name) => {
    const transform = getRegistrations().transformers[name];

    expect(transform(user)).toEqual({ resource });
  });

  describe('getAdminUserChanges', () => {
    test('records only the fields that changed', () => {
      expect(
        getAdminUserChanges(
          { firstname: 'Ana', lastname: 'Diaz', email: 'ana@acme.com', isActive: true },
          { firstname: 'Ana', lastname: 'Ruiz', email: 'ana@acme.com', isActive: false }
        )
      ).toEqual({
        lastname: { before: 'Diaz', after: 'Ruiz' },
        isActive: { before: true, after: false },
      });
    });

    test('compares roles as sorted id sets, whether rows or ids', () => {
      expect(getAdminUserChanges({ roles: [{ id: 3 }, { id: 1 }] }, { roles: [1, 3] })).toEqual({});
      expect(
        getAdminUserChanges({ roles: [{ id: 1 }] }, { roles: [{ id: 1 }, { id: 2 }] })
      ).toEqual({ roles: { before: [1], after: [1, 2] } });
    });

    test('treats a missing and a null value as the same, and a null isActive as false', () => {
      expect(
        getAdminUserChanges({ username: undefined, isActive: null }, { username: null })
      ).toEqual({});
    });

    test('ignores fields outside the tracked list', () => {
      expect(
        getAdminUserChanges(
          { resetPasswordToken: 'a', password: 'x' } as any,
          { resetPasswordToken: 'b', password: 'y' } as any
        )
      ).toEqual({});
    });
  });

  test('touchesTrackedFields tells when the previous row is needed', () => {
    expect(touchesTrackedFields({ isActive: false })).toBe(true);
    expect(touchesTrackedFields({ roles: [1] })).toBe(true);
    expect(touchesTrackedFields({ password: 'x' })).toBe(false);
    expect(touchesTrackedFields({ resetPasswordToken: 'x', resetPasswordTokenExpiresAt: 1 })).toBe(
      false
    );
  });

  describe('emitters', () => {
    const strapi = {} as any;
    const row = {
      id: 7,
      email: 'ana@acme.com',
      firstname: 'Ana',
      lastname: null,
      isActive: false,
      roles: [{ id: 2, code: 'strapi-editor' }],
      password: 'hash',
      registrationToken: 'tok',
    };

    beforeEach(() => {
      jest.mocked(emitAudit).mockClear();
    });

    test('created: account fields and role ids, never the hash or the token', async () => {
      await emitAdminUserCreated({ strapi }, row);

      expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin-user.create', {
        userId: 7,
        email: 'ana@acme.com',
        firstname: 'Ana',
        lastname: null,
        roles: [2],
        isActive: false,
      });
    });

    test('deleted: the account only', async () => {
      await emitAdminUserDeleted({ strapi }, row);

      expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin-user.delete', {
        userId: 7,
        email: 'ana@acme.com',
      });
    });

    test('updated: emits update with the changes when a tracked field changed', async () => {
      await emitAdminUserUpdateAudits(
        { strapi },
        { previous: { ...row, isActive: true }, updated: row, attributes: { isActive: false } }
      );

      expect(emitAudit).toHaveBeenCalledTimes(1);
      expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin-user.update', {
        userId: 7,
        email: 'ana@acme.com',
        changes: { isActive: { before: true, after: false } },
      });
    });

    test('updated: emits nothing when nothing tracked changed', async () => {
      await emitAdminUserUpdateAudits(
        { strapi },
        { previous: row, updated: row, attributes: { isActive: false } }
      );

      expect(emitAudit).not.toHaveBeenCalled();
    });

    test('updated: emits password.update with the account only, never the hash', async () => {
      await emitAdminUserUpdateAudits(
        { strapi },
        { previous: null, updated: row, attributes: { password: 'Secret1234' } }
      );

      expect(emitAudit).toHaveBeenCalledTimes(1);
      expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin-user.password.update', {
        userId: 7,
        email: 'ana@acme.com',
      });
    });

    test('updated: a password change together with a field change emits both', async () => {
      await emitAdminUserUpdateAudits(
        { strapi },
        {
          previous: { ...row, firstname: 'A' },
          updated: row,
          attributes: { firstname: 'Ana', password: 'Secret1234' },
        }
      );

      expect(jest.mocked(emitAudit).mock.calls.map((call) => call[1])).toEqual([
        'admin-user.update',
        'admin-user.password.update',
      ]);
    });

    test('updated: emits nothing when the row was not found', async () => {
      await emitAdminUserUpdateAudits(
        { strapi },
        { previous: row, updated: undefined, attributes: { isActive: false } }
      );

      expect(emitAudit).not.toHaveBeenCalled();
    });
  });
});
