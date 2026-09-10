import type { Core } from '@strapi/types';
import {
  DEFAULT_MFA_ENFORCEMENT,
  DEFAULT_TRUSTED_DEVICES,
  DEFAULT_PASSKEYS,
  SECURITY_SETTINGS_KEY,
  readMfaEnforcement,
  readTrustedDeviceSettings,
  readPasskeySettings,
  resetSecuritySettingsWarnings,
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
  beforeEach(() => {
    resetSecuritySettingsWarnings();
  });

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

  test('a persistently corrupt row warns once per key per process, not on every read', async () => {
    const { strapi } = buildStrapi({ mfa: { mode: 'sometimes', graceDays: 'soon' } });

    await readMfaEnforcement(strapi);
    await readMfaEnforcement(strapi);

    expect(strapi.log.warn).toHaveBeenCalledTimes(2);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('mfa.mode'));
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('mfa.graceDays'));
  });
});

describe('security-settings: readTrustedDeviceSettings', () => {
  beforeEach(() => {
    resetSecuritySettingsWarnings();
  });

  test('defaults to enabled / 30 days when nothing is stored', async () => {
    const { strapi } = buildStrapi(null);

    await expect(readTrustedDeviceSettings(strapi)).resolves.toEqual(DEFAULT_TRUSTED_DEVICES);
    expect(DEFAULT_TRUSTED_DEVICES).toEqual({ enabled: true, days: 30 });
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('returns the stored object', async () => {
    const { strapi } = buildStrapi({ trustedDevices: { enabled: false, days: 7 } });

    await expect(readTrustedDeviceSettings(strapi)).resolves.toEqual({ enabled: false, days: 7 });
  });

  test('a document with only mfa falls back to the trusted-device defaults without a warning', async () => {
    const { strapi } = buildStrapi({ mfa: { mode: 'off', graceDays: 3 } });

    await expect(readTrustedDeviceSettings(strapi)).resolves.toEqual(DEFAULT_TRUSTED_DEVICES);
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('falls back per key: a valid days survives a corrupt enabled', async () => {
    const { strapi } = buildStrapi({ trustedDevices: { enabled: 'yes', days: 14 } });

    await expect(readTrustedDeviceSettings(strapi)).resolves.toEqual({ enabled: true, days: 14 });
    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('trustedDevices.enabled'));
  });

  test.each([[0], [91], [7.5], ['30'], [null]])(
    'days %p is corrupt and warns once',
    async (days) => {
      const { strapi } = buildStrapi({ trustedDevices: { enabled: true, days } });

      await readTrustedDeviceSettings(strapi);
      await readTrustedDeviceSettings(strapi);

      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('trustedDevices.days'));
      await expect(readTrustedDeviceSettings(strapi)).resolves.toEqual({ enabled: true, days: 30 });
    }
  );
});

describe('security-settings: readPasskeySettings', () => {
  beforeEach(() => {
    resetSecuritySettingsWarnings();
  });

  test('defaults to enabled when nothing is stored', async () => {
    const { strapi } = buildStrapi(null);

    await expect(readPasskeySettings(strapi)).resolves.toEqual(DEFAULT_PASSKEYS);
    expect(DEFAULT_PASSKEYS).toEqual({ enabled: true });
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('returns the stored object', async () => {
    const { strapi } = buildStrapi({ passkeys: { enabled: false } });

    await expect(readPasskeySettings(strapi)).resolves.toEqual({ enabled: false });
  });

  test('a document with only the other two objects falls back without a warning', async () => {
    const { strapi } = buildStrapi({
      mfa: { mode: 'off', graceDays: 3 },
      trustedDevices: { enabled: true, days: 30 },
    });

    await expect(readPasskeySettings(strapi)).resolves.toEqual(DEFAULT_PASSKEYS);
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test.each([['yes'], [1], [null], [{}]])(
    'enabled %p is corrupt and warns once',
    async (enabled) => {
      const { strapi } = buildStrapi({ passkeys: { enabled } });

      await readPasskeySettings(strapi);
      await readPasskeySettings(strapi);

      // The fallback is the default, not "off": a corrupt value is not a decision to turn a
      // security feature off.
      await expect(readPasskeySettings(strapi)).resolves.toEqual({ enabled: true });
      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('passkeys.enabled'));
    }
  );
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
    const clearAllTrustedDevices = jest.fn(() => Promise.resolve(0));
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
        return row ? { ...row, ...options.actor } : null;
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
            clearAllTrustedDevices,
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
      roleQuery,
      storeSet,
      emit,
      assertPasswordAndFactor,
      clearAllTrustedDevices,
      validatePassword,
      transaction,
    };
  };

  const actor = { id: 7 };

  test('getSettings merges the stored document, defaults and the flagged roles', async () => {
    const { service } = setup({ stored: { mfa: { mode: 'required' } } });
    await expect(service.getSettings()).resolves.toEqual({
      mfa: { mode: 'required', graceDays: 7, requiredRoles: ['2'] },
      trustedDevices: { enabled: true, days: 30 },
      passkeys: { enabled: true },
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
    ).resolves.toEqual({
      mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2', '3'] },
      trustedDevices: { enabled: true, days: 30 },
      passkeys: { enabled: true },
    });
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
      { mfa: { mode: 'required', graceDays: 5, requiredRoles: ['1'] } },
      actor
    );

    expect(result).toEqual({
      mfa: { mode: 'required', graceDays: 5, requiredRoles: ['1'] },
      trustedDevices: { enabled: true, days: 30 },
      passkeys: { enabled: true },
    });
    expect(storeSet).toHaveBeenCalledWith({
      key: 'security-settings',
      value: {
        mfa: { mode: 'required', graceDays: 5 },
        trustedDevices: { enabled: true, days: 30 },
        passkeys: { enabled: true },
      },
    });
    expect(roles.map((r) => [r.id, r.mfaRequired])).toEqual([
      [1, true],
      [2, false],
      [3, false],
    ]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('admin.security-settings.update', {
      previous: {
        mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] },
        trustedDevices: { enabled: true, days: 30 },
        passkeys: { enabled: true },
      },
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
    ).resolves.toEqual({
      mfa: { mode: 'required', graceDays: 7, requiredRoles: [] },
      trustedDevices: { enabled: true, days: 30 },
      passkeys: { enabled: true },
    });
  });

  test('the same role drop is a real downgrade once the mode itself drops to optional', async () => {
    const { service, storeSet } = setup({ stored: { mfa: { mode: 'required' } }, enrolled: true });
    await expect(
      service.updateSettings({ mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] } }, actor)
    ).rejects.toThrow(/password is required/i);
    expect(storeSet).not.toHaveBeenCalled();
  });

  test('increasing graceDays is a downgrade: needs the password (and a code when enrolled)', async () => {
    const enrolled = setup({ stored: { mfa: { mode: 'optional', graceDays: 7 } }, enrolled: true });
    const body = { mfa: { mode: 'optional' as const, graceDays: 14, requiredRoles: ['2'] } };
    await expect(enrolled.service.updateSettings(body, actor)).rejects.toThrow(
      /password is required/i
    );
    expect(enrolled.storeSet).not.toHaveBeenCalled();
    await expect(
      enrolled.service.updateSettings({ ...body, password: 'pw', code: '123456' }, actor)
    ).resolves.toMatchObject({ mfa: { graceDays: 14 } });
    expect(enrolled.assertPasswordAndFactor).toHaveBeenCalledWith('7', 'pw', '123456');
  });

  test('decreasing or keeping graceDays is not a downgrade', async () => {
    const { service } = setup({
      stored: { mfa: { mode: 'optional', graceDays: 7 } },
      enrolled: true,
    });
    await expect(
      service.updateSettings(
        { mfa: { mode: 'optional', graceDays: 3, requiredRoles: ['2'] } },
        actor
      )
    ).resolves.toMatchObject({ mfa: { graceDays: 3 } });
    await expect(
      service.updateSettings(
        { mfa: { mode: 'optional', graceDays: 3, requiredRoles: ['2'] } },
        actor
      )
    ).resolves.toMatchObject({ mfa: { graceDays: 3 } });
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
    ).resolves.toEqual({
      mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] },
      trustedDevices: { enabled: true, days: 30 },
      passkeys: { enabled: true },
    });
  });

  test('a body with only trustedDevices leaves mfa and the role flags untouched', async () => {
    const { service, roles, roleQuery, storeSet } = setup({
      stored: { mfa: { mode: 'required', graceDays: 3 } },
      enrolled: true,
    });

    await expect(
      service.updateSettings({ trustedDevices: { enabled: true, days: 7 } }, actor)
    ).resolves.toEqual({
      mfa: { mode: 'required', graceDays: 3, requiredRoles: ['2'] },
      trustedDevices: { enabled: true, days: 7 },
      passkeys: { enabled: true },
    });

    expect(roles.find((r) => r.id === 2)!.mfaRequired).toBe(true);
    expect(roles.find((r) => r.id === 3)!.mfaRequired).toBe(false);
    // The role flags being unchanged above is consistent with either "left alone" or "rewritten
    // to the same values" -- this is the assertion that actually distinguishes them.
    expect(roleQuery.updateMany).not.toHaveBeenCalled();
    expect(storeSet).toHaveBeenCalledWith({
      key: SECURITY_SETTINGS_KEY,
      value: {
        mfa: { mode: 'required', graceDays: 3 },
        trustedDevices: { enabled: true, days: 7 },
        passkeys: { enabled: true },
      },
    });
  });

  test('a body with only mfa keeps the stored trustedDevices', async () => {
    const { service } = setup({
      stored: {
        mfa: { mode: 'optional', graceDays: 7 },
        trustedDevices: { enabled: false, days: 14 },
      },
    });

    await expect(
      service.updateSettings(
        { mfa: { mode: 'optional', graceDays: 5, requiredRoles: ['2'] } },
        actor
      )
    ).resolves.toMatchObject({
      mfa: { graceDays: 5 },
      trustedDevices: { enabled: false, days: 14 },
    });
  });

  test('a body with none of the three objects is rejected before anything is read or written', async () => {
    const { service, storeSet } = setup();

    await expect(service.updateSettings({ password: 'pw' }, actor)).rejects.toThrow(
      /mfa, trustedDevices or passkeys/
    );
    expect(storeSet).not.toHaveBeenCalled();
  });

  test('enabling trusted devices is a downgrade: needs the password (and a code when enrolled)', async () => {
    const unenrolled = setup({ stored: { trustedDevices: { enabled: false, days: 30 } } });
    const body = { trustedDevices: { enabled: true, days: 30 } };

    await expect(unenrolled.service.updateSettings(body, actor)).rejects.toThrow(
      /password is required/i
    );
    expect(unenrolled.storeSet).not.toHaveBeenCalled();
    await expect(
      unenrolled.service.updateSettings({ ...body, password: 'pw' }, actor)
    ).resolves.toMatchObject({ trustedDevices: { enabled: true } });
    expect(unenrolled.validatePassword).toHaveBeenCalledWith('pw', 'hashed');

    const enrolled = setup({
      stored: { trustedDevices: { enabled: false, days: 30 } },
      enrolled: true,
    });
    await expect(
      enrolled.service.updateSettings({ ...body, password: 'pw' }, actor)
    ).rejects.toThrow(/code is required/i);
    await expect(
      enrolled.service.updateSettings({ ...body, password: 'pw', code: '123456' }, actor)
    ).resolves.toMatchObject({ trustedDevices: { enabled: true } });
    expect(enrolled.assertPasswordAndFactor).toHaveBeenCalledWith('7', 'pw', '123456');
  });

  test('raising days while enabled is a downgrade; raising them while disabled is not', async () => {
    const enabled = setup({ stored: { trustedDevices: { enabled: true, days: 30 } } });
    await expect(
      enabled.service.updateSettings({ trustedDevices: { enabled: true, days: 60 } }, actor)
    ).rejects.toThrow(/password is required/i);
    await expect(
      enabled.service.updateSettings(
        { trustedDevices: { enabled: true, days: 60 }, password: 'pw' },
        actor
      )
    ).resolves.toMatchObject({ trustedDevices: { days: 60 } });

    const disabled = setup({ stored: { trustedDevices: { enabled: false, days: 30 } } });
    await expect(
      disabled.service.updateSettings({ trustedDevices: { enabled: false, days: 60 } }, actor)
    ).resolves.toMatchObject({ trustedDevices: { enabled: false, days: 60 } });
  });

  test('lowering days or disabling is not a downgrade', async () => {
    const { service, validatePassword, assertPasswordAndFactor } = setup({
      stored: { trustedDevices: { enabled: true, days: 30 } },
      enrolled: true,
    });

    await expect(
      service.updateSettings({ trustedDevices: { enabled: true, days: 7 } }, actor)
    ).resolves.toMatchObject({ trustedDevices: { days: 7 } });
    await expect(
      service.updateSettings({ trustedDevices: { enabled: false, days: 7 } }, actor)
    ).resolves.toMatchObject({ trustedDevices: { enabled: false } });
    expect(validatePassword).not.toHaveBeenCalled();
    expect(assertPasswordAndFactor).not.toHaveBeenCalled();
  });

  test('the update event carries both objects in previous and next', async () => {
    const { service, emit } = setup();

    await service.updateSettings({ trustedDevices: { enabled: true, days: 7 } }, actor);

    expect(emit).toHaveBeenCalledWith('admin.security-settings.update', {
      previous: expect.objectContaining({ trustedDevices: { enabled: true, days: 30 } }),
      next: expect.objectContaining({ trustedDevices: { enabled: true, days: 7 } }),
    });
  });

  test('turning trusted devices off empties the table inside the write; nothing else touches it', async () => {
    const on = setup({ stored: { trustedDevices: { enabled: true, days: 30 } } });
    await on.service.updateSettings({ trustedDevices: { enabled: false, days: 30 } }, actor);
    expect(on.clearAllTrustedDevices).toHaveBeenCalledTimes(1);
    expect(on.transaction).toHaveBeenCalledTimes(1);

    const lower = setup({ stored: { trustedDevices: { enabled: true, days: 30 } } });
    await lower.service.updateSettings({ trustedDevices: { enabled: true, days: 7 } }, actor);
    expect(lower.clearAllTrustedDevices).not.toHaveBeenCalled();

    const alreadyOff = setup({ stored: { trustedDevices: { enabled: false, days: 30 } } });
    await alreadyOff.service.updateSettings({ trustedDevices: { enabled: false, days: 7 } }, actor);
    expect(alreadyOff.clearAllTrustedDevices).not.toHaveBeenCalled();

    const mfaOnly = setup({ stored: { trustedDevices: { enabled: true, days: 30 } } });
    await mfaOnly.service.updateSettings(
      { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] } },
      actor
    );
    expect(mfaOnly.clearAllTrustedDevices).not.toHaveBeenCalled();
  });

  test('a body with only passkeys leaves mfa, the role flags and trustedDevices untouched', async () => {
    const { service, roles, storeSet } = setup({
      stored: {
        mfa: { mode: 'required', graceDays: 3 },
        trustedDevices: { enabled: false, days: 14 },
      },
      enrolled: true,
    });

    await expect(service.updateSettings({ passkeys: { enabled: true } }, actor)).resolves.toEqual({
      mfa: { mode: 'required', graceDays: 3, requiredRoles: ['2'] },
      trustedDevices: { enabled: false, days: 14 },
      passkeys: { enabled: true },
    });

    expect(roles.find((r) => r.id === 2)!.mfaRequired).toBe(true);
    expect(storeSet).toHaveBeenCalledWith({
      key: SECURITY_SETTINGS_KEY,
      value: {
        mfa: { mode: 'required', graceDays: 3 },
        trustedDevices: { enabled: false, days: 14 },
        passkeys: { enabled: true },
      },
    });
  });

  test('turning passkeys ON needs no credentials: it strengthens the second factor', async () => {
    const { service, storeSet } = setup({ stored: { passkeys: { enabled: false } } });

    await expect(
      service.updateSettings({ passkeys: { enabled: true } }, actor)
    ).resolves.toMatchObject({ passkeys: { enabled: true } });
    expect(storeSet).toHaveBeenCalled();
  });

  test('turning passkeys OFF needs the password, and a code when the caller is enrolled', async () => {
    const unenrolled = setup({ stored: { passkeys: { enabled: true } } });
    const body = { passkeys: { enabled: false } };

    await expect(unenrolled.service.updateSettings(body, actor)).rejects.toThrow(
      /password is required to change two-factor settings/i
    );
    expect(unenrolled.storeSet).not.toHaveBeenCalled();

    await expect(
      unenrolled.service.updateSettings({ ...body, password: 'pw' }, actor)
    ).resolves.toMatchObject({ passkeys: { enabled: false } });
    expect(unenrolled.validatePassword).toHaveBeenCalledWith('pw', 'hashed');

    const enrolled = setup({ stored: { passkeys: { enabled: true } }, enrolled: true });
    await expect(
      enrolled.service.updateSettings({ ...body, password: 'pw' }, actor)
    ).rejects.toThrow(/code is required to change two-factor settings/i);
    await expect(
      enrolled.service.updateSettings({ ...body, password: 'pw', code: '123456' }, actor)
    ).resolves.toMatchObject({ passkeys: { enabled: false } });
    expect(enrolled.assertPasswordAndFactor).toHaveBeenCalledWith('7', 'pw', '123456');
  });

  test('the re-authentication messages are neutral: disabling passkeys is not "lowering requirements"', async () => {
    const { service } = setup({ stored: { passkeys: { enabled: true } } });

    await expect(service.updateSettings({ passkeys: { enabled: false } }, actor)).rejects.toThrow(
      /change two-factor settings/
    );
    await expect(
      service.updateSettings({ passkeys: { enabled: false } }, actor)
    ).rejects.not.toThrow(/lower two-factor authentication requirements/);
  });

  test('a password-less (SSO-only) caller may disable passkeys, but nothing else', async () => {
    // In an SSO-only organisation every administrator is password-less, so the cycle 2 refusal
    // would make this a setting nobody could ever change, and the CLI offers no escape. Accepted
    // cost: a stolen SSO session can wipe the organisation's passkeys -- everything that session
    // could do instead (resetting each user's MFA through `admin::users.update`) is already worse.
    const passwordless = { password: null };

    const only = setup({
      stored: { passkeys: { enabled: true } },
      actor: passwordless,
      exempt: true,
    });
    await expect(
      only.service.updateSettings({ passkeys: { enabled: false } }, actor)
    ).resolves.toMatchObject({ passkeys: { enabled: false } });
    expect(only.validatePassword).not.toHaveBeenCalled();

    // Combined with a real downgrade it is refused exactly as today.
    const combined = setup({
      stored: { mfa: { mode: 'required', graceDays: 7 }, passkeys: { enabled: true } },
      actor: passwordless,
      exempt: true,
    });
    await expect(
      combined.service.updateSettings(
        { mfa: { mode: 'off', graceDays: 7, requiredRoles: [] }, passkeys: { enabled: false } },
        actor
      )
    ).rejects.toThrow(/no local password/);
    expect(combined.storeSet).not.toHaveBeenCalled();
  });
});
