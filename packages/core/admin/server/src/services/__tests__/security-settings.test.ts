import type { Core } from '@strapi/types';
import {
  DEFAULT_MFA_ENFORCEMENT,
  SECURITY_SETTINGS_KEY,
  readMfaEnforcement,
  createSecuritySettingsService,
} from '../security-settings';

const buildStrapi = (stored: unknown) => {
  const get = jest.fn(async ({ key }: { key: string }) =>
    key === SECURITY_SETTINGS_KEY ? stored : null
  );
  const store = jest.fn(() => ({ get, set: jest.fn() }));
  return { strapi: { store, log: { warn: jest.fn() } } as unknown as Core.Strapi, store, get };
};

describe('security-settings: readMfaEnforcement', () => {
  test('defaults to optional / 7 days when nothing is stored', async () => {
    const { strapi, store } = buildStrapi(null);

    await expect(readMfaEnforcement(strapi)).resolves.toEqual(DEFAULT_MFA_ENFORCEMENT);
    expect(store).toHaveBeenCalledWith({ type: 'core', name: 'admin' });
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('returns the stored mode and grace period', async () => {
    const { strapi } = buildStrapi({ mfa: { mode: 'required', graceDays: 3 } });

    await expect(readMfaEnforcement(strapi)).resolves.toEqual({ mode: 'required', graceDays: 3 });
  });

  test('a stored document missing a key falls back per key', async () => {
    const { strapi } = buildStrapi({ mfa: { mode: 'off' } });

    await expect(readMfaEnforcement(strapi)).resolves.toEqual({ mode: 'off', graceDays: 7 });
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('a corrupt stored value is ignored with a warning, never thrown', async () => {
    const { strapi } = buildStrapi({ mfa: { mode: 'sometimes', graceDays: 'soon' } });

    await expect(readMfaEnforcement(strapi)).resolves.toEqual(DEFAULT_MFA_ENFORCEMENT);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringMatching(/security-settings/));
  });
});

describe('security-settings: service', () => {
  type RoleRow = { id: number; mfaRequired: boolean | null };

  const setup = (
    options: {
      stored?: unknown;
      actor?: Record<string, unknown>;
      enrolled?: boolean;
      exempt?: boolean;
      passwordOk?: boolean;
    } = {}
  ) => {
    const roles: RoleRow[] = [
      { id: 1, mfaRequired: null },
      { id: 2, mfaRequired: true },
      { id: 3, mfaRequired: false },
    ];
    const users = [
      {
        id: 7,
        email: 'admin@example.com',
        password: 'hashed',
        roles: [{ id: 1 }],
        mfaGraceUntil: null,
        mfaLockedAt: null,
      },
      {
        id: 8,
        email: 'graced@example.com',
        password: 'hashed',
        roles: [],
        mfaGraceUntil: new Date(),
        mfaLockedAt: null,
      },
      {
        id: 9,
        email: 'locked@example.com',
        password: 'hashed',
        roles: [],
        mfaGraceUntil: new Date(0),
        mfaLockedAt: new Date(),
      },
    ];
    let stored: unknown = options.stored ?? null;
    const storeGet = jest.fn(async () => stored);
    const storeSet = jest.fn(async ({ value }: { value: unknown }) => {
      stored = value;
    });
    const emit = jest.fn();
    const assertPasswordAndFactor = jest.fn(() => Promise.resolve());
    const validatePassword = jest.fn(() => Promise.resolve(options.passwordOk ?? true));
    const transaction = jest.fn(async (run: () => Promise<unknown>) => run());

    const roleQuery = {
      findMany: jest.fn(async ({ where }: any) => {
        if (where?.mfaRequired === true)
          return roles.filter((r) => r.mfaRequired === true).map((r) => ({ id: r.id }));
        if (where?.id?.$in)
          return roles
            .filter((r) => where.id.$in.map(String).includes(String(r.id)))
            .map((r) => ({ id: r.id }));
        return roles.map((r) => ({ ...r }));
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const role of roles) {
          const inList = (list: unknown[]) => list.map(String).includes(String(role.id));
          if (where?.id?.$in && !inList(where.id.$in)) continue;
          if (where?.id?.$notIn && inList(where.id.$notIn)) continue;
          Object.assign(role, data);
          count += 1;
        }
        return { count };
      }),
    };
    const userQuery = {
      findOne: jest.fn(async ({ where }: any) => {
        const row = users.find((u) => String(u.id) === String(where.id));
        return row ? { ...row, ...(options.actor ?? {}) } : null;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const user of users) {
          if (where.mfaLockedAt === null && user.mfaLockedAt !== null) continue;
          if (where.mfaGraceUntil?.$notNull && user.mfaGraceUntil === null) continue;
          Object.assign(user, data);
          count += 1;
        }
        return { count };
      }),
    };

    const strapi = {
      store: jest.fn(() => ({ get: storeGet, set: storeSet })),
      log: { warn: jest.fn() },
      eventHub: { emit },
      db: {
        transaction,
        query: jest.fn((uid: string) => {
          if (uid === 'admin::role') return roleQuery;
          if (uid === 'admin::user') return userQuery;
          throw new Error(`unexpected uid ${uid}`);
        }),
      },
      service: jest.fn((uid: string) => {
        if (uid === 'admin::mfa') {
          return {
            isExemptFromMfa: jest.fn(() => Promise.resolve(options.exempt ?? false)),
            isEnrolled: jest.fn(() => Promise.resolve(options.enrolled ?? false)),
            assertPasswordAndFactor,
          };
        }
        if (uid === 'admin::auth') return { validatePassword };
        throw new Error(`unexpected service ${uid}`);
      }),
    } as unknown as Core.Strapi;

    const service = createSecuritySettingsService({ strapi });
    return {
      service,
      roles,
      users,
      storeSet,
      emit,
      assertPasswordAndFactor,
      validatePassword,
      transaction,
    };
  };

  const actor = { id: 7 };

  test('getSettings merges the stored document, defaults and the flagged roles', async () => {
    const { service } = setup({ stored: { mfa: { mode: 'required' } } });
    await expect(service.getSettings()).resolves.toEqual({
      mfa: { mode: 'required', graceDays: 7, requiredRoles: ['2'] },
    });
  });

  test('raising to required is refused unless the caller is enrolled', async () => {
    const { service, storeSet } = setup();
    await expect(
      service.updateSettings(
        { mfa: { mode: 'required', graceDays: 7, requiredRoles: ['2'] } },
        actor
      )
    ).rejects.toThrow('Enrol in two-factor authentication before requiring it for others');
    expect(storeSet).not.toHaveBeenCalled();
  });

  test('adding a role the caller holds is refused unless enrolled; adding one they do not hold is fine', async () => {
    const held = setup();
    await expect(
      held.service.updateSettings(
        { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['1', '2'] } },
        actor
      )
    ).rejects.toThrow(/Enrol in two-factor/);

    const notHeld = setup();
    await expect(
      notHeld.service.updateSettings(
        { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2', '3'] } },
        actor
      )
    ).resolves.toEqual({ mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2', '3'] } });
  });

  test('an exempt (SSO-only) caller passes the guard', async () => {
    const { service } = setup({ exempt: true });
    await expect(
      service.updateSettings({ mfa: { mode: 'required', graceDays: 7, requiredRoles: [] } }, actor)
    ).resolves.toMatchObject({ mfa: { mode: 'required' } });
  });

  test('an exempt (SSO-only) caller has no local password to re-authenticate a downgrade with', async () => {
    const { service, storeSet } = setup({
      stored: { mfa: { mode: 'required' } },
      exempt: true,
      actor: { password: null },
    });
    await expect(
      service.updateSettings(
        { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] } },
        actor
      )
    ).rejects.toThrow(/no local password/i);
    expect(storeSet).not.toHaveBeenCalled();
  });

  test('an enrolled caller raises to required and the store and role flags are written together', async () => {
    const { service, roles, storeSet, transaction, emit } = setup({ enrolled: true });

    const result = await service.updateSettings(
      { mfa: { mode: 'required', graceDays: 10, requiredRoles: ['1'] } },
      actor
    );

    expect(result).toEqual({ mfa: { mode: 'required', graceDays: 10, requiredRoles: ['1'] } });
    expect(storeSet).toHaveBeenCalledWith({
      key: 'security-settings',
      value: { mfa: { mode: 'required', graceDays: 10 } },
    });
    expect(roles.map((r) => [r.id, r.mfaRequired])).toEqual([
      [1, true],
      [2, false],
      [3, false],
    ]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('admin.security-settings.update', {
      previous: { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] } },
      next: result,
    });
  });

  test('lowering the mode needs the password, plus a code when the caller is enrolled', async () => {
    const enrolled = setup({ stored: { mfa: { mode: 'required' } }, enrolled: true });
    const body = { mfa: { mode: 'optional' as const, graceDays: 7, requiredRoles: ['2'] } };
    await expect(enrolled.service.updateSettings(body, actor)).rejects.toThrow(
      /password is required/i
    );
    expect(enrolled.storeSet).not.toHaveBeenCalled();
    await expect(
      enrolled.service.updateSettings({ ...body, password: 'pw' }, actor)
    ).rejects.toThrow(/code is required/i);
    expect(enrolled.storeSet).not.toHaveBeenCalled();
    await expect(
      enrolled.service.updateSettings({ ...body, password: 'pw', code: '123456' }, actor)
    ).resolves.toMatchObject({ mfa: { mode: 'optional' } });
    expect(enrolled.assertPasswordAndFactor).toHaveBeenCalledWith('7', 'pw', '123456');

    const unenrolled = setup({ stored: { mfa: { mode: 'optional' } }, passwordOk: false });
    await expect(
      unenrolled.service.updateSettings(
        { mfa: { mode: 'off', graceDays: 7, requiredRoles: ['2'] }, password: 'wrong' },
        actor
      )
    ).rejects.toThrow(/invalid credentials/i);
    expect(unenrolled.storeSet).not.toHaveBeenCalled();
  });

  test('removing a required role is a downgrade too', async () => {
    const { service } = setup({ enrolled: true });
    await expect(
      service.updateSettings({ mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] } }, actor)
    ).rejects.toThrow(/password is required/i);
  });

  test('dropping every required role while the mode stays required needs no re-authentication', async () => {
    const { service } = setup({ stored: { mfa: { mode: 'required' } }, enrolled: true });
    await expect(
      service.updateSettings({ mfa: { mode: 'required', graceDays: 7, requiredRoles: [] } }, actor)
    ).resolves.toEqual({ mfa: { mode: 'required', graceDays: 7, requiredRoles: [] } });
  });

  test('the same role drop is a real downgrade once the mode itself drops to optional', async () => {
    const { service, storeSet } = setup({ stored: { mfa: { mode: 'required' } }, enrolled: true });
    await expect(
      service.updateSettings({ mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] } }, actor)
    ).rejects.toThrow(/password is required/i);
    expect(storeSet).not.toHaveBeenCalled();
  });

  test('leaving off clears pending grace stamps but not locks', async () => {
    const { service, users } = setup({ stored: { mfa: { mode: 'off' } }, enrolled: true });

    await service.updateSettings(
      { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] } },
      actor
    );

    expect(users.find((u) => u.id === 8)!.mfaGraceUntil).toBeNull();
    expect(users.find((u) => u.id === 9)!.mfaLockedAt).not.toBeNull();
    expect(users.find((u) => u.id === 9)!.mfaGraceUntil).toEqual(new Date(0));
  });

  test('optional → required clears nothing', async () => {
    const { service, users } = setup({ enrolled: true });
    await service.updateSettings(
      { mfa: { mode: 'required', graceDays: 7, requiredRoles: ['2'] } },
      actor
    );
    expect(users.find((u) => u.id === 8)!.mfaGraceUntil).not.toBeNull();
  });

  test('off → off clears nothing', async () => {
    const { service, users } = setup({ stored: { mfa: { mode: 'off' } }, enrolled: true });
    await service.updateSettings(
      { mfa: { mode: 'off', graceDays: 7, requiredRoles: ['2'] } },
      actor
    );
    expect(users.find((u) => u.id === 8)!.mfaGraceUntil).not.toBeNull();
  });

  test('an unknown role id is rejected before anything is written', async () => {
    const { service, storeSet } = setup({ enrolled: true });
    await expect(
      service.updateSettings(
        { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2', '42'] } },
        actor
      )
    ).rejects.toThrow(/unknown role/i);
    expect(storeSet).not.toHaveBeenCalled();
  });

  test('duplicate role ids in requiredRoles are de-duplicated', async () => {
    const { service } = setup();
    await expect(
      service.updateSettings(
        { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2', '2'] } },
        actor
      )
    ).resolves.toEqual({ mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] } });
  });
});
