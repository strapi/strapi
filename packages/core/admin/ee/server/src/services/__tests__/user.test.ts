/* eslint-env jest */

import eeUserService from '../user';

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
          // `removeFromEEDisabledUsersList` resolves this via `strapi.service('admin::seat-enforcement')`
          // (see `tests/setup/unit.setup.js`, which routes `strapi.service` through
          // `strapi.admin.services`). Returning a falsy list short-circuits it before it ever
          // reaches `strapi.store`, keeping the `store` double above genuinely unused.
          'seat-enforcement': { getDisabledUserList: jest.fn(() => Promise.resolve(null)) },
        },
      },
    });

    await eeUserService.deleteById(3);

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
    ]) {
      expect(payload).not.toHaveProperty(column);
    }
    expect(payload.roles).toEqual([{ id: 2, code: 'strapi-editor', name: 'Editor' }]);
  });
});
