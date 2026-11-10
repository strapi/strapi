import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { USER_UID } from '../../constants';
import userSecurityService, { SECURITY_ACTIONS } from '../user-security';

const DOC = 'user-1';

const session = (over: Record<string, unknown> = {}) => ({
  id: 'sess-1',
  userId: DOC,
  token: 'SECRET-TOKEN',
  expiresAt: new Date('2030-01-02T00:00:00Z'),
  createdAt: new Date('2030-01-01T00:00:00Z'),
  updatedAt: new Date('2030-01-01T00:00:00Z'),
  ipAddress: '10.0.0.1',
  userAgent: 'agent',
  ...over,
});

const account = (id: string, providerId = 'credential') => ({
  id,
  userId: DOC,
  providerId,
  accountId: DOC,
  createdAt: new Date(),
  updatedAt: new Date(),
});

interface Options {
  user?: Record<string, unknown> | null;
  accounts?: ReturnType<typeof account>[];
  sessions?: ReturnType<typeof session>[];
  allowed?: boolean;
  query?: unknown;
  found?: unknown;
  redirects?: Record<string, string | null>;
  hasPasskeyType?: boolean;
  passkeys?: number;
}

const setup = ({
  user = { documentId: DOC, email: 'a@x.io', twoFactorEnabled: false },
  accounts = [account('acc-1'), account('acc-2', 'google')],
  sessions = [session()],
  allowed = true,
  query = {},
  found = { documentId: DOC },
  redirects = { passwordReset: null, emailVerified: null, error: null },
  hasPasskeyType = false,
  passkeys = 0,
}: Options = {}) => {
  const engine = {
    listAccounts: vi.fn(async () => accounts),
    listSessions: vi.fn(async () => sessions),
    revokeSession: vi.fn(async () => undefined),
    revokeSessions: vi.fn(async () => undefined),
    unlinkAccount: vi.fn(async () => undefined),
    ban: vi.fn(async () => undefined),
    unban: vi.fn(async () => undefined),
    unlock: vi.fn(async () => undefined),
    resetTwoFactor: vi.fn(async () => undefined),
    sendPasswordReset: vi.fn(async () => undefined),
    sendVerificationEmail: vi.fn(async () => undefined),
  };
  const findFirst = vi.fn(async (params: { fields?: string[] }) => (params.fields ? found : user));
  const documents = vi.fn(() => ({ findFirst }));
  const createPermissionsManager = vi.fn<
    (options?: { ability?: unknown }) => { isAllowed: unknown; getQuery: () => unknown }
  >(() => ({
    isAllowed: allowed,
    getQuery: () => query,
  }));
  const count = vi.fn(async () => passkeys);
  const db = { query: vi.fn(() => ({ count })) };
  const describeAbility = vi.fn(async () => ({ roles: [], routes: [], subjects: {} }));
  const forUser = vi.fn(async () => ({ rules: [] }));
  const getForUser = vi.fn(async () => [{ documentId: 'role-1', name: 'R', type: 'custom' }]);
  const services: Record<string, unknown> = {
    engine: { get: () => engine },
    settings: { get: async () => ({ redirects }) },
    role: { getForUser },
    ability: { forUser, describe: describeAbility },
  };
  const strapi = {
    plugin: () => ({ service: (name: string) => services[name] }),
    service: () => ({ createPermissionsManager }),
    documents,
    db,
    contentTypes: {
      [USER_UID]: { attributes: { email: {}, username: {}, banned: {} } },
      ...(hasPasskeyType ? { 'plugin::end-users.passkey': {} } : {}),
    },
  } as unknown as Core.Strapi;

  return {
    service: userSecurityService({ strapi }),
    engine,
    findFirst,
    createPermissionsManager,
    count,
    describe: describeAbility,
    forUser,
    getForUser,
  };
};

/** An admin ability whose permission for every action carries these rules */
const abilityOf = (rules: Array<{ fields?: string[] | null; inverted?: boolean }>) => ({
  rulesFor: () => rules,
});
const UNRESTRICTED = abilityOf([{ fields: null }]);

describe('user-security service', () => {
  describe('get', () => {
    it('answers the accounts, sessions, two-factor, passkeys and status', async () => {
      const { service } = setup({
        user: {
          documentId: DOC,
          email: 'a@x.io',
          twoFactorEnabled: true,
          banned: true,
          banReason: 'spam',
          banExpires: new Date('2031-01-01T00:00:00Z'),
          lockedUntil: null,
        },
        hasPasskeyType: true,
        passkeys: 2,
      });

      expect(await service.get(DOC)).toEqual({
        accounts: [
          { id: 'acc-1', providerId: 'credential' },
          { id: 'acc-2', providerId: 'google' },
        ],
        twoFactor: true,
        passkeys: 2,
        sessions: [
          {
            id: 'sess-1',
            createdAt: '2030-01-01T00:00:00.000Z',
            expiresAt: '2030-01-02T00:00:00.000Z',
            ipAddress: '10.0.0.1',
            userAgent: 'agent',
          },
        ],
        status: {
          banned: true,
          banReason: 'spam',
          banExpires: '2031-01-01T00:00:00.000Z',
          lockedUntil: null,
        },
      });
    });

    it('never includes a session token', async () => {
      const { service } = setup({ sessions: [session(), session({ id: 'sess-2' })] });

      const security = await service.get(DOC);

      expect(JSON.stringify(security)).not.toContain('SECRET-TOKEN');
      expect(security.sessions.every((entry) => !('token' in entry))).toBe(true);
    });

    it('counts no passkeys when the passkey table is not installed', async () => {
      const { service, count } = setup();

      expect((await service.get(DOC)).passkeys).toBe(0);
      expect(count).not.toHaveBeenCalled();
    });

    it('is not found for a user that is gone', async () => {
      const { service } = setup({ user: null });

      await expect(service.get(DOC)).rejects.toThrow('User not found');
    });
  });

  it('revokes one session', async () => {
    const { service, engine } = setup();

    await service.revokeSession(DOC, 'sess-1');

    expect(engine.revokeSession).toHaveBeenCalledWith(DOC, 'sess-1');
  });

  it('revokes every session', async () => {
    const { service, engine } = setup();

    await service.revokeSessions(DOC);

    expect(engine.revokeSessions).toHaveBeenCalledWith(DOC);
  });

  describe('unlinkAccount', () => {
    it('unlinks an account', async () => {
      const { service, engine } = setup();

      await service.unlinkAccount(DOC, 'acc-2');

      expect(engine.unlinkAccount).toHaveBeenCalledWith(DOC, 'acc-2');
    });

    it('refuses unlinking the last account', async () => {
      const { service, engine } = setup({ accounts: [account('acc-1')] });

      await expect(service.unlinkAccount(DOC, 'acc-1')).rejects.toThrow(/last sign-in method/);
      expect(engine.unlinkAccount).not.toHaveBeenCalled();
    });

    it('is not found for an account the user does not have', async () => {
      const { service, engine } = setup();

      await expect(service.unlinkAccount(DOC, 'other')).rejects.toThrow('Account not found');
      expect(engine.unlinkAccount).not.toHaveBeenCalled();
    });
  });

  describe('ban', () => {
    it('bans with a reason and an end date', async () => {
      const { service, engine } = setup();
      const expiresAt = new Date(Date.now() + 86_400_000).toISOString();

      await service.ban(DOC, { reason: 'spam', expiresAt });

      expect(engine.ban).toHaveBeenCalledWith(DOC, 'spam', new Date(expiresAt));
    });

    it('bans with neither', async () => {
      const { service, engine } = setup();

      await service.ban(DOC, {});

      expect(engine.ban).toHaveBeenCalledWith(DOC, undefined, undefined);
    });

    it.each([
      ['a reason that is not a text', { reason: 5 }],
      ['a reason that is too long', { reason: 'x'.repeat(501) }],
      ['an end date that is not a date', { expiresAt: 'soon' }],
      ['an end date that is not a text', { expiresAt: 12 }],
      ['an end date in the past', { expiresAt: '2000-01-01T00:00:00Z' }],
    ])('refuses %s', async (_name, input) => {
      const { service, engine } = setup();

      await expect(service.ban(DOC, input)).rejects.toThrow();
      expect(engine.ban).not.toHaveBeenCalled();
    });
  });

  it('unbans', async () => {
    const { service, engine } = setup();

    await service.unban(DOC);

    expect(engine.unban).toHaveBeenCalledWith(DOC);
  });

  it('unlocks', async () => {
    const { service, engine } = setup();

    await service.unlock(DOC);

    expect(engine.unlock).toHaveBeenCalledWith(DOC);
  });

  it('resets two-factor', async () => {
    const { service, engine } = setup();

    await service.resetTwoFactor(DOC);

    expect(engine.resetTwoFactor).toHaveBeenCalledWith(DOC);
  });

  describe('emails', () => {
    it('sends a password reset to the user, to the setting or the root', async () => {
      const first = setup();

      await first.service.sendPasswordReset(DOC);

      expect(first.engine.sendPasswordReset).toHaveBeenCalledWith('a@x.io', '/');

      const second = setup({
        redirects: { passwordReset: '/reset', emailVerified: null, error: null },
      });

      await second.service.sendPasswordReset(DOC);

      expect(second.engine.sendPasswordReset).toHaveBeenCalledWith('a@x.io', '/reset');
    });

    it('sends a verification email, to the setting or the root', async () => {
      const first = setup();

      await first.service.sendVerification(DOC);

      expect(first.engine.sendVerificationEmail).toHaveBeenCalledWith(DOC, '/');

      const second = setup({
        redirects: { passwordReset: null, emailVerified: '/welcome', error: null },
      });

      await second.service.sendVerification(DOC);

      expect(second.engine.sendVerificationEmail).toHaveBeenCalledWith(DOC, '/welcome');
    });
  });

  it('describes the permissions the way permissions/me does, for that user', async () => {
    const { service, describe: describeAbility, forUser, getForUser } = setup();

    const described = await service.effectivePermissions(DOC);

    expect(getForUser).toHaveBeenCalledWith(DOC);
    expect(forUser).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: DOC }),
      expect.any(Array)
    );
    expect(describeAbility).toHaveBeenCalledWith({
      credentials: { documentId: DOC, roles: [expect.objectContaining({ documentId: 'role-1' })] },
      ability: { rules: [] },
    });
    expect(described).toEqual({ roles: [], routes: [], subjects: {} });
  });

  describe('authorize', () => {
    it('checks explorer.read and explorer.update on the user type', async () => {
      const { service, createPermissionsManager } = setup();
      const ability = UNRESTRICTED;

      await service.authorize(ability, 'read', DOC);
      await service.authorize(ability, 'update', DOC);

      expect(createPermissionsManager).toHaveBeenNthCalledWith(1, {
        ability,
        action: 'plugin::content-manager.explorer.read',
        model: USER_UID,
      });
      expect(createPermissionsManager).toHaveBeenNthCalledWith(2, {
        ability,
        action: 'plugin::content-manager.explorer.update',
        model: USER_UID,
      });
      expect(SECURITY_ACTIONS).toEqual({
        read: 'plugin::content-manager.explorer.read',
        update: 'plugin::content-manager.explorer.update',
      });
    });

    it('refuses an admin who does not hold the action', async () => {
      const { service, findFirst } = setup({ allowed: false });

      await expect(service.authorize(UNRESTRICTED, 'update', DOC)).rejects.toThrow(/update access/);
      expect(findFirst).not.toHaveBeenCalled();
    });

    it('refuses a field-limited admin on a read and on an action', async () => {
      const { service, findFirst } = setup();
      const limited = abilityOf([{ fields: ['email'] }]);

      await expect(service.authorize(limited, 'read', DOC)).rejects.toThrow(/every field/);
      await expect(service.authorize(limited, 'update', DOC)).rejects.toThrow(/every field/);
      expect(findFirst).not.toHaveBeenCalled();
    });

    it('lets through an admin whose fields name every attribute, and refuses a missing one', async () => {
      const { service } = setup();

      await expect(
        service.authorize(
          abilityOf([{ fields: ['email', 'username'] }, { fields: ['banned'] }]),
          'update',
          DOC
        )
      ).resolves.toBeUndefined();
      await expect(
        service.authorize(abilityOf([{ fields: ['email', 'username'] }]), 'update', DOC)
      ).rejects.toThrow(/every field/);
    });

    it('refuses when the ability cannot be read as rules, or has an inverted rule', async () => {
      const { service } = setup();

      await expect(service.authorize({}, 'update', DOC)).rejects.toThrow(/every field/);
      await expect(
        service.authorize(
          abilityOf([{ fields: null }, { inverted: true, fields: ['email'] }]),
          'update',
          DOC
        )
      ).rejects.toThrow(/every field/);
    });

    describe('a field-limited permission beside a full one', () => {
      type Rule = { fields?: string[] | null; conditions?: Record<string, unknown> };

      /** A CASL-like ability: `rulesFor` with a field answers the rules that cover it. */
      const caslLike = (rules: Rule[]) => ({
        rulesFor: (_action: string, _subject: string, field?: string) =>
          rules.filter(
            (rule) => field === undefined || !rule.fields || rule.fields.includes(field)
          ),
      });

      /** What the permissions manager makes of the rules it is given: their conditions, or none to apply. */
      const managerOf = (given: ReturnType<typeof caslLike>) => {
        const rules = given.rulesFor('', '') as Rule[];

        return {
          isAllowed: rules.length > 0,
          getQuery: () =>
            rules.some((rule) => !rule.conditions)
              ? {}
              : { $or: rules.map((rule) => rule.conditions) },
        };
      };

      it('reaches only the users every field of which the admin can reach', async () => {
        const { service, findFirst, createPermissionsManager } = setup();
        const owned = { owner: { $eq: 'me' } };
        const ability = caslLike([{ fields: null, conditions: owned }, { fields: ['email'] }]);

        createPermissionsManager.mockImplementation((options) =>
          managerOf(options?.ability as ReturnType<typeof caslLike>)
        );

        await service.authorize(ability, 'update', DOC);

        // The `[email]` rule has no condition, so its own field is open to everyone and narrows
        // nothing; the others are reachable only through the rule that has one. The ORed query of
        // every rule would be `{}`, which reaches every user.
        const [{ filters }] = findFirst.mock.calls[0] as unknown as [
          { filters: { $and: unknown[] } },
        ];

        expect(filters.$and[0]).toEqual({ documentId: DOC });
        expect(filters.$and[1]).toEqual({ $and: [{ $or: [owned] }] });
      });

      it('refuses when the query of one field cannot be built', async () => {
        const { service, findFirst, createPermissionsManager } = setup();
        const ability = caslLike([
          { fields: null, conditions: { owner: 1 } },
          { fields: ['email'] },
        ]);
        let calls = 0;

        // The first call is the one for the whole permission, the next ones are one per field
        createPermissionsManager.mockImplementation(() => {
          calls += 1;

          return { isAllowed: true, getQuery: () => (calls === 3 ? null : {}) } as never;
        });

        await expect(service.authorize(ability, 'update', DOC)).rejects.toThrow(/every field/);
        expect(findFirst).not.toHaveBeenCalled();
      });
    });

    it('looks the user up within what the admin may reach', async () => {
      const { service, findFirst } = setup({ query: { createdAt: { $gt: 1 } } });

      await service.authorize(UNRESTRICTED, 'read', DOC);

      expect(findFirst).toHaveBeenCalledWith({
        filters: { $and: [{ documentId: DOC }, { createdAt: { $gt: 1 } }] },
        fields: ['documentId'],
      });
    });

    it('is not found for a user outside the admin reach', async () => {
      const { service } = setup({ found: null });

      await expect(service.authorize(UNRESTRICTED, 'read', DOC)).rejects.toThrow('User not found');
    });
  });
});
