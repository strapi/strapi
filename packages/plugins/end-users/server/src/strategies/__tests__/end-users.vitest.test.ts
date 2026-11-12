import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { USER_UID } from '../../constants';
import { koaCtx } from '../../engine/better-auth/__tests__/utils/koa-ctx';
import type { SessionLookup } from '../../engine/types';
import { resolveLegacyUserId, verifyLegacyBearer } from '../../compat/legacy-jwt';
import createEndUsersStrategy, { ALWAYS_ALLOWED_SCOPES, isEndUsersStrategy } from '../end-users';

vi.mock('../../compat/config', () => ({ readCompatConfig: vi.fn(() => ({ legacyJwt: {} })) }));
vi.mock('../../compat/legacy-jwt', () => ({
  verifyLegacyBearer: vi.fn(async () => null),
  resolveLegacyUserId: vi.fn(async () => null),
}));

const NO_SESSION: SessionLookup = {
  session: null,
  credentials: false,
  source: null,
  setCookies: [],
};

const SESSION = {
  id: 'session-1',
  userId: 'user-1',
  token: 'secret-token',
  deviceId: null,
  passedSecondFactor: false,
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const storedUser = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  documentId: 'user-1',
  email: 'alice@example.com',
  username: 'alice',
  name: 'Alice',
  image: null,
  emailVerified: true,
  banned: false,
  banReason: null,
  banExpires: null,
  twoFactorEnabled: false,
  createdAt: '2026-10-28T00:00:00.000Z',
  ...overrides,
});

type Held = Array<{
  id?: number;
  documentId: string;
  name: string;
  description?: string | null;
  type: string;
  requireTwoFactor: boolean;
}>;

const HELD: Held = [
  {
    id: 3,
    documentId: 'role-a',
    name: 'Authenticated',
    description: 'Default role',
    type: 'authenticated',
    requireTwoFactor: false,
  },
  {
    id: 4,
    documentId: 'role-b',
    name: 'Editors',
    description: null,
    type: 'custom',
    requireTwoFactor: false,
  },
];

const TRUSTED = 'https://app.example.com';
const UNTRUSTED = 'https://evil.example.com';

const ABILITY = { can: vi.fn<(action: string) => boolean>(() => true) };

/** What is set to be sent as cookies on the response. */
const cookiesOf = (ctx: ReturnType<typeof koaCtx>) =>
  [ctx.res.getHeader('set-cookie') ?? []].flat();

const setup = ({
  lookup = { ...NO_SESSION },
  user = storedUser() as Record<string, unknown> | null,
  held = HELD,
  requireEmailVerification = false,
  compat = false,
}: {
  lookup?: SessionLookup;
  user?: Record<string, unknown> | null;
  held?: Held;
  requireEmailVerification?: boolean;
  compat?: boolean;
} = {}) => {
  const lookupSession = vi.fn(async () => lookup);
  // The engine's matcher, as far as these tests need it: one trusted origin, and its pages
  const isTrustedOrigin = vi.fn(
    async (origin: string) => origin === TRUSTED || origin.startsWith(`${TRUSTED}/`)
  );
  const forUser = vi.fn(async () => ABILITY);
  const getForUser = vi.fn(async () => held);
  const findOne = vi.fn(async () => user);
  const settings = { signUp: { requireEmailVerification } };
  const get = vi.fn(async () => settings);
  const recordLegacyHit = vi.fn();

  const services: Record<string, unknown> = {
    engine: { get: () => ({ lookupSession, isTrustedOrigin }) },
    role: { getForUser },
    ability: { forUser },
    settings: { get },
    compat: { recordLegacyHit },
  };

  const strapi = {
    plugin: vi.fn(() => ({ service: (name: string) => services[name] })),
    db: { query: vi.fn(() => ({ findOne })) },
  } as unknown as Core.Strapi;

  return {
    strategy: createEndUsersStrategy(strapi, compat),
    lookupSession,
    isTrustedOrigin,
    forUser,
    getForUser,
    findOne,
    settings,
    recordLegacyHit,
    query: strapi.db.query as unknown as ReturnType<typeof vi.fn>,
  };
};

/** A session the engine found; from the cookie unless the test says otherwise. */
const signedIn = (extra: Partial<SessionLookup> = {}): SessionLookup => ({
  session: SESSION,
  credentials: true,
  source: 'cookie',
  setCookies: [],
  ...extra,
});

/** What the strategy did with a request: what it returned, or the error it threw. */
const outcomeOf = (promise: Promise<unknown>) => promise.catch((thrown: unknown) => thrown);

const codeOf = (outcome: unknown) => (outcome as errors.PolicyError).details;

describe('the end-users strategy', () => {
  describe('its name and the role it exposes', () => {
    it('is named end-users with compat off and has no role', async () => {
      const { strategy } = setup({ lookup: signedIn() });
      const ctx = koaCtx();

      await strategy.authenticate(ctx);

      expect(strategy.name).toBe('end-users');
      expect(ctx.state.user).not.toHaveProperty('role');
    });

    it('is named users-permissions with compat on and sets role to the first role next to roles', async () => {
      const { strategy } = setup({ lookup: signedIn(), compat: true });
      const ctx = koaCtx();

      await strategy.authenticate(ctx);

      expect(strategy.name).toBe('users-permissions');
      expect(ctx.state.user.role).toEqual({
        id: 3,
        name: 'Authenticated',
        description: 'Default role',
        type: 'authenticated',
      });
      expect(ctx.state.user.roles.map((role: { documentId: string }) => role.documentId)).toEqual([
        'role-a',
        'role-b',
      ]);
    });
  });

  describe('isEndUsersStrategy', () => {
    it('accepts users-permissions only with compat on, and end-users only with it off', () => {
      expect(isEndUsersStrategy('end-users', false)).toBe(true);
      expect(isEndUsersStrategy('users-permissions', false)).toBe(false);
      expect(isEndUsersStrategy('users-permissions', true)).toBe(true);
      expect(isEndUsersStrategy('end-users', true)).toBe(false);
      expect(isEndUsersStrategy(undefined, true)).toBe(false);
    });
  });

  beforeEach(() => {
    ABILITY.can.mockReset().mockReturnValue(true);
  });

  it('is named end-users', () => {
    expect(setup().strategy.name).toBe('end-users');
  });

  describe('authenticate', () => {
    describe('with no credentials', () => {
      it('is the Public role: authenticated, with no one behind it', async () => {
        const { strategy, forUser, query } = setup();

        const result = await strategy.authenticate(koaCtx());

        expect(result).toEqual({ authenticated: true, credentials: null, ability: ABILITY });
        expect(forUser).toHaveBeenCalledWith(null, []);
        expect(query).not.toHaveBeenCalled();
      });

      it('sets no user on the context', async () => {
        const { strategy } = setup();
        const ctx = koaCtx();

        await strategy.authenticate(ctx);

        expect(ctx.state.user).toBeUndefined();
      });
    });

    describe('with credentials that name no session', () => {
      const STALE: SessionLookup = {
        session: null,
        credentials: true,
        source: 'cookie',
        setCookies: [],
      };
      const CLEARING = [
        'strapi.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
        'strapi.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
      ];

      it('is a 401, never the Public role', async () => {
        const { strategy, forUser } = setup({ lookup: STALE });

        const result = await strategy.authenticate(koaCtx());

        expect(result.authenticated).toBe(false);
        expect(result.error).toBeInstanceOf(errors.UnauthorizedError);
        expect(forUser).not.toHaveBeenCalled();
      });

      it('is a 401 for a Bearer token too', async () => {
        const { strategy } = setup({ lookup: { ...STALE, source: 'bearer' } });

        const result = await strategy.authenticate(koaCtx());

        expect(result.error).toBeInstanceOf(errors.UnauthorizedError);
      });

      it('sets no cookie and no user when the engine clears nothing', async () => {
        const { strategy } = setup({ lookup: STALE });
        const ctx = koaCtx();

        await strategy.authenticate(ctx);

        expect(cookiesOf(ctx)).toEqual([]);
        expect(ctx.response.get('Cache-Control')).toBe('');
        expect(ctx.state.user).toBeUndefined();
      });

      it('clears a stale session cookie: the 401 carries the cookies the engine clears it with', async () => {
        const { strategy } = setup({ lookup: { ...STALE, setCookies: CLEARING } });
        const ctx = koaCtx({ headers: { cookie: 'strapi.session_token=stale.sig' } });

        const result = await strategy.authenticate(ctx);

        expect(result.error).toBeInstanceOf(errors.UnauthorizedError);
        expect(cookiesOf(ctx)).toEqual(CLEARING);
        expect(ctx.response.get('Cache-Control')).toBe('private, no-store');
      });

      it('sends no cookie to a Bearer client, whatever the engine hands over', async () => {
        const { strategy } = setup({
          lookup: { ...STALE, source: 'bearer', setCookies: CLEARING },
        });
        const ctx = koaCtx({ headers: { authorization: 'Bearer stale' } });

        await strategy.authenticate(ctx);

        expect(cookiesOf(ctx)).toEqual([]);
      });
    });

    it('asks the engine with the headers of the request', async () => {
      const { strategy, lookupSession } = setup();

      await strategy.authenticate(
        koaCtx({ headers: { cookie: 'strapi.session_token=abc', authorization: 'Bearer xyz' } })
      );

      const [headers] = lookupSession.mock.calls[0] as unknown as [Headers];

      expect(headers).toBeInstanceOf(Headers);
      expect(headers.get('cookie')).toBe('strapi.session_token=abc');
      expect(headers.get('authorization')).toBe('Bearer xyz');
    });

    it('lets an engine failure through as an error: it is never read as no credentials', async () => {
      const { strategy, lookupSession, forUser } = setup();
      lookupSession.mockRejectedValue(new Error('database is down'));

      await expect(strategy.authenticate(koaCtx())).rejects.toThrow('database is down');
      expect(forUser).not.toHaveBeenCalled();
    });

    describe('with a session', () => {
      it('is the user, with the roles they hold, and the credentials of the request', async () => {
        const { strategy, findOne, getForUser } = setup({ lookup: signedIn() });

        const result = await strategy.authenticate(koaCtx());

        expect(findOne).toHaveBeenCalledWith({ where: { documentId: 'user-1' } });
        expect(getForUser).toHaveBeenCalledWith('user-1');
        expect(result).toEqual({
          authenticated: true,
          ability: ABILITY,
          credentials: {
            id: 7,
            documentId: 'user-1',
            email: 'alice@example.com',
            username: 'alice',
            name: 'Alice',
            image: null,
            emailVerified: true,
            roles: [
              { documentId: 'role-a', name: 'Authenticated', type: 'authenticated' },
              { documentId: 'role-b', name: 'Editors', type: 'custom' },
            ],
          },
        });
      });

      it('reads the user from the plugin user type', async () => {
        const { strategy, query } = setup({ lookup: signedIn() });

        await strategy.authenticate(koaCtx());

        expect(query).toHaveBeenCalledWith(USER_UID);
      });

      it('sets the same user on ctx.state.user', async () => {
        const { strategy } = setup({ lookup: signedIn() });
        const ctx = koaCtx();

        const result = await strategy.authenticate(ctx);

        expect(ctx.state.user).toBe(result.credentials);
      });

      it('keeps what must not reach a route handler out of the user', async () => {
        const { strategy } = setup({
          lookup: signedIn(),
          user: storedUser({ banReason: 'spam', twoFactorEnabled: true, password: 'x' }),
        });

        const { credentials } = await strategy.authenticate(koaCtx());

        expect(Object.keys(credentials as object).sort()).toEqual([
          'documentId',
          'email',
          'emailVerified',
          'id',
          'image',
          'name',
          'roles',
          'username',
        ]);
        expect(JSON.stringify(credentials)).not.toContain('secret-token');
      });

      it('builds the ability from the roles the user holds', async () => {
        const { strategy, forUser } = setup({ lookup: signedIn() });

        await strategy.authenticate(koaCtx());

        expect(forUser).toHaveBeenCalledTimes(1);

        const [user, roles] = forUser.mock.calls[0] as unknown as [
          { documentId: string },
          Array<{ documentId: string }>,
        ];

        expect(user.documentId).toBe('user-1');
        expect(roles.map(({ documentId }) => documentId)).toEqual(['role-a', 'role-b']);
      });

      it('builds it from the row it read, every attribute included, and the roles as held', async () => {
        const stored = storedUser({ company: 'Acme' });
        const { strategy, forUser } = setup({ lookup: signedIn(), user: stored });

        const { credentials } = await strategy.authenticate(koaCtx());

        // `$user.<attribute>` needs more than the seven the credentials carry; the ability
        // service leaves out what is private
        expect(forUser).toHaveBeenCalledWith(stored, HELD);
        expect(credentials).not.toHaveProperty('company');
      });

      it('gives missing optional fields as null and a missing flag as false', async () => {
        const { strategy } = setup({
          lookup: signedIn(),
          user: storedUser({ username: undefined, image: undefined, emailVerified: undefined }),
        });

        const { credentials } = await strategy.authenticate(koaCtx());

        expect(credentials).toMatchObject({ username: null, image: null, emailVerified: false });
      });

      it('is a 401 when the user of the session is gone', async () => {
        const { strategy, forUser } = setup({ lookup: signedIn(), user: null });

        const result = await strategy.authenticate(koaCtx());

        expect(result.authenticated).toBe(false);
        expect(result.error).toBeInstanceOf(errors.UnauthorizedError);
        expect(forUser).not.toHaveBeenCalled();
      });
    });

    describe('a banned user', () => {
      const refusal = async (user: Record<string, unknown>) => {
        const { strategy, getForUser, forUser } = setup({ lookup: signedIn(), user });
        const ctx = koaCtx();

        const outcome = await strategy.authenticate(ctx).catch((thrown: unknown) => thrown);

        return { outcome, ctx, getForUser, forUser };
      };

      it('is refused with 403 and the code USER_BANNED', async () => {
        const { outcome } = await refusal(storedUser({ banned: true }));

        expect(outcome).toBeInstanceOf(errors.PolicyError);
        expect((outcome as errors.PolicyError).details).toEqual({ code: 'USER_BANNED' });
      });

      it('is refused before roles are loaded or an ability is built', async () => {
        const { getForUser, forUser } = await refusal(storedUser({ banned: true }));

        expect(getForUser).not.toHaveBeenCalled();
        expect(forUser).not.toHaveBeenCalled();
      });

      it('is refused while the ban has not run out', async () => {
        const { outcome } = await refusal(
          storedUser({ banned: true, banExpires: new Date(Date.now() + 60_000) })
        );

        expect(outcome).toBeInstanceOf(errors.PolicyError);
      });

      it('reads the end of the ban from a string too', async () => {
        const { outcome } = await refusal(
          storedUser({ banned: true, banExpires: new Date(Date.now() + 60_000).toISOString() })
        );

        expect(outcome).toBeInstanceOf(errors.PolicyError);
      });

      it('is refused when the end of the ban cannot be read: the ban holds', async () => {
        for (const banExpires of ['not a date', 'Invalid Date', {}, Number.NaN]) {
          // eslint-disable-next-line no-await-in-loop
          const { outcome } = await refusal(storedUser({ banned: true, banExpires }));

          expect(outcome, String(banExpires)).toBeInstanceOf(errors.PolicyError);
          expect(codeOf(outcome)).toEqual({ code: 'USER_BANNED' });
        }
      });

      it('is let in once the ban has run out', async () => {
        const { outcome } = await refusal(
          storedUser({ banned: true, banExpires: new Date(Date.now() - 1000) })
        );

        expect(outcome).toMatchObject({ authenticated: true });
      });

      it('gets no cookie and no user on the context', async () => {
        const { strategy } = setup({
          lookup: signedIn({ setCookies: ['strapi.session_token=fresh; Path=/'] }),
          user: storedUser({ banned: true }),
        });
        const ctx = koaCtx();

        await strategy.authenticate(ctx).catch(() => {});

        expect(cookiesOf(ctx)).toEqual([]);
        expect(ctx.state.user).toBeUndefined();
      });

      it('is not a ban when the flag is off, whatever the reason says', async () => {
        const { outcome } = await refusal(
          storedUser({ banned: false, banReason: 'old', banExpires: new Date(Date.now() + 1e6) })
        );

        expect(outcome).toMatchObject({ authenticated: true });
      });
    });

    describe('an unverified user, when the settings require a verified email', () => {
      const unverified = () =>
        setup({
          lookup: signedIn(),
          user: storedUser({ emailVerified: false }),
          requireEmailVerification: true,
        });

      it('is refused with 403 and the code EMAIL_NOT_VERIFIED, as a PolicyError', async () => {
        const { strategy } = unverified();
        const outcome = await outcomeOf(strategy.authenticate(koaCtx()));

        expect(outcome).toBeInstanceOf(errors.PolicyError);
        expect(codeOf(outcome)).toEqual({ code: 'EMAIL_NOT_VERIFIED' });
      });

      it('is refused before roles are loaded or an ability is built', async () => {
        const { strategy, getForUser, forUser } = unverified();

        await outcomeOf(strategy.authenticate(koaCtx()));

        expect(getForUser).not.toHaveBeenCalled();
        expect(forUser).not.toHaveBeenCalled();
      });

      it('is checked after the ban and before two-factor: a banned user hears about the ban', async () => {
        const banned = setup({
          lookup: signedIn(),
          user: storedUser({ emailVerified: false, banned: true }),
          requireEmailVerification: true,
        });
        const noSecondFactor = setup({
          lookup: signedIn(),
          user: storedUser({ emailVerified: false, twoFactorEnabled: false }),
          requireEmailVerification: true,
          held: HELD.map((role) => ({ ...role, requireTwoFactor: true })),
        });

        expect(codeOf(await outcomeOf(banned.strategy.authenticate(koaCtx())))).toEqual({
          code: 'USER_BANNED',
        });
        expect(codeOf(await outcomeOf(noSecondFactor.strategy.authenticate(koaCtx())))).toEqual({
          code: 'EMAIL_NOT_VERIFIED',
        });
      });

      it('lets a verified user in', async () => {
        const { strategy } = setup({ lookup: signedIn(), requireEmailVerification: true });

        const result = await strategy.authenticate(koaCtx());

        expect(result.authenticated).toBe(true);
      });

      it('lets the user in on the next request once they are verified: the setting and the row are read each time', async () => {
        const { strategy, findOne } = unverified();

        await expect(strategy.authenticate(koaCtx())).rejects.toBeInstanceOf(errors.PolicyError);

        findOne.mockResolvedValue(storedUser({ emailVerified: true }));

        expect((await strategy.authenticate(koaCtx())).authenticated).toBe(true);
      });

      it('lets an unverified user in when the setting is off, and reads it on every request', async () => {
        const { strategy, settings } = setup({
          lookup: signedIn(),
          user: storedUser({ emailVerified: false }),
        });

        expect((await strategy.authenticate(koaCtx())).authenticated).toBe(true);

        settings.signUp.requireEmailVerification = true;

        await expect(strategy.authenticate(koaCtx())).rejects.toBeInstanceOf(errors.PolicyError);
      });
    });

    describe('a role that requires two-factor authentication', () => {
      const EDITORS_2FA = {
        documentId: 'role-b',
        name: 'Editors',
        type: 'custom',
        requireTwoFactor: true,
      };

      /** A session that passed a second factor: a password and a code, a passkey, a trusted device */
      const withSecondFactor = (extra: Partial<SessionLookup> = {}) =>
        signedIn({ session: { ...SESSION, passedSecondFactor: true }, ...extra });

      it('lets in a user who has enabled it, on a session that passed a second factor', async () => {
        const { strategy } = setup({
          lookup: withSecondFactor(),
          held: [EDITORS_2FA],
          user: storedUser({ twoFactorEnabled: true }),
        });

        const result = await strategy.authenticate(koaCtx());

        expect(result).toMatchObject({ authenticated: true, ability: ABILITY });
      });

      it('refuses a user who has enabled it on a session that did not pass one: a provider, a magic link, an emailed code', async () => {
        const { strategy, forUser } = setup({
          // `signedIn` is a session the engine did not mark, whichever way it was made
          lookup: signedIn(),
          held: [EDITORS_2FA],
          user: storedUser({ twoFactorEnabled: true }),
        });
        const ctx = koaCtx();

        const outcome = await outcomeOf(strategy.authenticate(ctx));

        expect(outcome).toBeInstanceOf(errors.PolicyError);
        expect(codeOf(outcome)).toEqual({ code: 'TWO_FACTOR_REQUIRED' });
        expect((outcome as Error).message).toMatch(/sign in again with your second factor/i);
        expect(forUser).not.toHaveBeenCalled();
        expect(ctx.state.user).toBeUndefined();
      });

      it('keeps its own message for a user who has none set up, whatever the session', async () => {
        for (const lookup of [signedIn(), withSecondFactor()]) {
          const { strategy } = setup({
            lookup,
            held: [EDITORS_2FA],
            user: storedUser({ twoFactorEnabled: false }),
          });

          // eslint-disable-next-line no-await-in-loop
          const outcome = await outcomeOf(strategy.authenticate(koaCtx()));

          expect((outcome as Error).message).toBe(
            'Two-factor authentication is required for your role.'
          );
        }
      });

      it('refuses a session whose mark is anything but true', async () => {
        for (const passedSecondFactor of [undefined, null, 1, 'true']) {
          const { strategy } = setup({
            lookup: signedIn({ session: { ...SESSION, passedSecondFactor } as never }),
            held: [EDITORS_2FA],
            user: storedUser({ twoFactorEnabled: true }),
          });

          // eslint-disable-next-line no-await-in-loop
          const outcome = await outcomeOf(strategy.authenticate(koaCtx()));

          expect(codeOf(outcome), String(passedSecondFactor)).toEqual({
            code: 'TWO_FACTOR_REQUIRED',
          });
        }
      });

      it('lets a session that did not pass a second factor in when no role held requires it', async () => {
        const { strategy } = setup({
          lookup: signedIn(),
          held: HELD,
          user: storedUser({ twoFactorEnabled: true }),
        });

        expect(await strategy.authenticate(koaCtx())).toMatchObject({ authenticated: true });
      });

      it('refuses an old Users & Permissions token for such a role: it has no session, so no second factor', async () => {
        vi.mocked(verifyLegacyBearer).mockResolvedValue({
          kind: 'legacy',
          userId: '7',
          issuedAt: 1,
        });
        vi.mocked(resolveLegacyUserId).mockResolvedValue('user-1');

        const { strategy } = setup({
          lookup: { session: null, credentials: true, source: 'bearer', setCookies: [] },
          compat: true,
          held: [EDITORS_2FA],
          user: storedUser({ twoFactorEnabled: true }),
        });

        const outcome = await outcomeOf(
          strategy.authenticate(koaCtx({ headers: { authorization: 'Bearer legacy-token' } }))
        );

        expect(codeOf(outcome)).toEqual({ code: 'TWO_FACTOR_REQUIRED' });

        // ...and is let in for a role that does not
        const open = setup({
          lookup: { session: null, credentials: true, source: 'bearer', setCookies: [] },
          compat: true,
          held: HELD,
          user: storedUser({ twoFactorEnabled: true }),
        });

        expect(
          await open.strategy.authenticate(
            koaCtx({ headers: { authorization: 'Bearer legacy-token' } })
          )
        ).toMatchObject({ authenticated: true });
      });

      it('refuses a user who has not, with 403 and the code TWO_FACTOR_REQUIRED', async () => {
        const { strategy, forUser } = setup({
          lookup: signedIn({ setCookies: ['strapi.session_token=fresh; Path=/'] }),
          held: [EDITORS_2FA],
          user: storedUser({ twoFactorEnabled: false }),
        });
        const ctx = koaCtx({ headers: { cookie: 'strapi.session_token=old.sig' } });

        const outcome = await outcomeOf(strategy.authenticate(ctx));

        expect(outcome).toBeInstanceOf(errors.PolicyError);
        expect(codeOf(outcome)).toEqual({ code: 'TWO_FACTOR_REQUIRED' });
        expect(forUser).not.toHaveBeenCalled();
        expect(ctx.state.user).toBeUndefined();
        expect(cookiesOf(ctx)).toEqual([]);
      });

      it('refuses a user whose flag is anything but true', async () => {
        for (const twoFactorEnabled of [null, undefined, 1, 'true']) {
          const { strategy } = setup({
            lookup: signedIn(),
            held: [EDITORS_2FA],
            user: storedUser({ twoFactorEnabled }),
          });

          // eslint-disable-next-line no-await-in-loop
          const outcome = await outcomeOf(strategy.authenticate(koaCtx()));

          expect(codeOf(outcome), String(twoFactorEnabled)).toEqual({
            code: 'TWO_FACTOR_REQUIRED',
          });
        }
      });

      it('does not ask for it when no role held requires it', async () => {
        const { strategy } = setup({
          lookup: signedIn(),
          held: HELD,
          user: storedUser({ twoFactorEnabled: false }),
        });

        const result = await strategy.authenticate(koaCtx());

        expect(result).toMatchObject({ authenticated: true });
      });

      it('refuses the user when one of several roles requires it', async () => {
        const { strategy } = setup({
          lookup: signedIn(),
          held: [
            HELD[0],
            EDITORS_2FA,
            { documentId: 'role-c', name: 'Readers', type: 'custom', requireTwoFactor: false },
          ],
          user: storedUser({ twoFactorEnabled: false }),
        });

        const outcome = await outcomeOf(strategy.authenticate(koaCtx()));

        expect(codeOf(outcome)).toEqual({ code: 'TWO_FACTOR_REQUIRED' });
      });

      it('is checked after the ban: a banned user is told they are banned', async () => {
        const { strategy } = setup({
          lookup: signedIn(),
          held: [EDITORS_2FA],
          user: storedUser({ banned: true, twoFactorEnabled: false }),
        });

        const outcome = await outcomeOf(strategy.authenticate(koaCtx()));

        expect(codeOf(outcome)).toEqual({ code: 'USER_BANNED' });
      });
    });

    describe('the origin of a request made with the session cookie', () => {
      const post = (headers: Record<string, string>, method = 'POST') =>
        koaCtx({ method, headers: { cookie: 'strapi.session_token=good.sig', ...headers } });

      it('lets a write from a trusted origin through, as the engine judged it', async () => {
        const { strategy, isTrustedOrigin } = setup({ lookup: signedIn() });

        const result = await strategy.authenticate(post({ origin: TRUSTED }));

        expect(result).toMatchObject({ authenticated: true });
        expect(isTrustedOrigin).toHaveBeenCalledWith(TRUSTED);
      });

      it('refuses a write from an origin that is not trusted, with 403 ORIGIN_NOT_TRUSTED', async () => {
        const { strategy, findOne, forUser } = setup({
          lookup: signedIn({ setCookies: ['strapi.session_token=fresh; Path=/'] }),
        });
        const ctx = post({ origin: UNTRUSTED });

        const outcome = await outcomeOf(strategy.authenticate(ctx));

        expect(outcome).toBeInstanceOf(errors.PolicyError);
        expect(codeOf(outcome)).toEqual({ code: 'ORIGIN_NOT_TRUSTED' });
        // before anything is read or set
        expect(findOne).not.toHaveBeenCalled();
        expect(forUser).not.toHaveBeenCalled();
        expect(ctx.state.user).toBeUndefined();
        expect(cookiesOf(ctx)).toEqual([]);
      });

      it.each(['PUT', 'PATCH', 'DELETE', 'post'])('checks %s too', async (method) => {
        const { strategy } = setup({ lookup: signedIn() });

        const outcome = await outcomeOf(strategy.authenticate(post({ origin: UNTRUSTED }, method)));

        expect(codeOf(outcome)).toEqual({ code: 'ORIGIN_NOT_TRUSTED' });
      });

      it('reads the Referer when there is no Origin', async () => {
        const trusted = setup({ lookup: signedIn() });
        const untrusted = setup({ lookup: signedIn() });

        const result = await trusted.strategy.authenticate(post({ referer: `${TRUSTED}/form` }));
        const outcome = await outcomeOf(
          untrusted.strategy.authenticate(post({ referer: `${UNTRUSTED}/form` }))
        );

        expect(result).toMatchObject({ authenticated: true });
        expect(trusted.isTrustedOrigin).toHaveBeenCalledWith(`${TRUSTED}/form`);
        expect(codeOf(outcome)).toEqual({ code: 'ORIGIN_NOT_TRUSTED' });
      });

      it('goes by the Origin when there is one, whatever the Referer says', async () => {
        const { strategy } = setup({ lookup: signedIn() });

        const outcome = await outcomeOf(
          strategy.authenticate(post({ origin: UNTRUSTED, referer: `${TRUSTED}/form` }))
        );

        expect(codeOf(outcome)).toEqual({ code: 'ORIGIN_NOT_TRUSTED' });
      });

      it('refuses the Origin null, without asking the engine', async () => {
        const { strategy, isTrustedOrigin } = setup({ lookup: signedIn() });

        const outcome = await outcomeOf(
          strategy.authenticate(post({ origin: 'null', referer: `${TRUSTED}/form` }))
        );

        expect(codeOf(outcome)).toEqual({ code: 'ORIGIN_NOT_TRUSTED' });
        expect(isTrustedOrigin).not.toHaveBeenCalled();
      });

      it('refuses a write with neither an Origin nor a Referer, as the engine does', async () => {
        const { strategy, isTrustedOrigin } = setup({ lookup: signedIn() });

        const outcome = await outcomeOf(strategy.authenticate(post({})));

        expect(codeOf(outcome)).toEqual({ code: 'ORIGIN_NOT_TRUSTED' });
        expect(isTrustedOrigin).not.toHaveBeenCalled();
      });

      it('does not check an OPTIONS, which carries no cookie', async () => {
        const { strategy, isTrustedOrigin } = setup({ lookup: signedIn() });

        const result = await strategy.authenticate(post({ origin: UNTRUSTED }, 'OPTIONS'));

        expect(result).toMatchObject({ authenticated: true });
        expect(isTrustedOrigin).not.toHaveBeenCalled();
      });

      it.each(['GET', 'HEAD'])(
        'refuses a %s sent by a page of an origin that is not trusted',
        async (method) => {
          // A cross-origin fetch always sends Origin. Were the CORS rules to let that page read
          // the answer, it would read what the cookie's user may read.
          const { strategy, findOne } = setup({ lookup: signedIn() });

          const outcome = await outcomeOf(
            strategy.authenticate(post({ origin: UNTRUSTED }, method))
          );

          expect(codeOf(outcome)).toEqual({ code: 'ORIGIN_NOT_TRUSTED' });
          expect(findOne).not.toHaveBeenCalled();
        }
      );

      it('refuses a GET with the Origin null', async () => {
        const { strategy } = setup({ lookup: signedIn() });

        const outcome = await outcomeOf(strategy.authenticate(post({ origin: 'null' }, 'GET')));

        expect(codeOf(outcome)).toEqual({ code: 'ORIGIN_NOT_TRUSTED' });
      });

      it('lets a GET from a trusted origin through', async () => {
        const { strategy } = setup({ lookup: signedIn() });

        const result = await strategy.authenticate(post({ origin: TRUSTED }, 'GET'));

        expect(result).toMatchObject({ authenticated: true });
      });

      it('lets a GET with no Origin through, whatever the Referer: a link followed from anywhere', async () => {
        const { strategy, isTrustedOrigin } = setup({ lookup: signedIn() });

        const result = await strategy.authenticate(post({ referer: `${UNTRUSTED}/page` }, 'GET'));

        expect(result).toMatchObject({ authenticated: true });
        expect(isTrustedOrigin).not.toHaveBeenCalled();
      });

      it('does not check a Bearer request: no other site can make a browser send one', async () => {
        const { strategy, isTrustedOrigin } = setup({ lookup: signedIn({ source: 'bearer' }) });

        const result = await strategy.authenticate(
          koaCtx({ method: 'POST', headers: { authorization: 'Bearer t.s', origin: UNTRUSTED } })
        );

        expect(result).toMatchObject({ authenticated: true });
        expect(isTrustedOrigin).not.toHaveBeenCalled();
      });

      it('does not check a request with no credentials: it is Public, from anywhere', async () => {
        const { strategy, isTrustedOrigin } = setup();

        const result = await strategy.authenticate(
          koaCtx({ method: 'POST', headers: { origin: UNTRUSTED } })
        );

        expect(result).toMatchObject({ authenticated: true, credentials: null });
        expect(isTrustedOrigin).not.toHaveBeenCalled();
      });
    });

    describe('a session the engine extended', () => {
      const FRESH = [
        'strapi.session_token=fresh.sig; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax',
        'strapi.session_data=cache; Max-Age=300; Path=/; HttpOnly; SameSite=Lax',
      ];

      it('sends the fresh cookie on to a cookie client, so its lifetime keeps sliding', async () => {
        const { strategy } = setup({ lookup: signedIn({ setCookies: FRESH }) });
        const ctx = koaCtx({ headers: { cookie: 'strapi.session_token=old.sig' } });

        await strategy.authenticate(ctx);

        expect(cookiesOf(ctx)).toEqual(FRESH);
      });

      it('keeps the response out of shared caches when it sets the cookie', async () => {
        const { strategy } = setup({ lookup: signedIn({ setCookies: FRESH }) });
        const ctx = koaCtx({ headers: { cookie: 'strapi.session_token=old.sig' } });

        await strategy.authenticate(ctx);

        expect(ctx.response.get('Cache-Control')).toBe('private, no-store');
      });

      it('adds to the cookies other middleware already set, and replaces none', async () => {
        const { strategy } = setup({ lookup: signedIn({ setCookies: FRESH }) });
        const ctx = koaCtx({ headers: { cookie: 'strapi.session_token=old.sig' } });
        ctx.append('Set-Cookie', 'locale=en; Path=/');

        await strategy.authenticate(ctx);

        expect(cookiesOf(ctx)).toEqual(['locale=en; Path=/', ...FRESH]);
      });

      it('does not send a cookie to a Bearer client, which has no use for one', async () => {
        const { strategy } = setup({ lookup: signedIn({ source: 'bearer', setCookies: FRESH }) });
        const ctx = koaCtx({ headers: { authorization: 'Bearer some.token' } });

        const result = await strategy.authenticate(ctx);

        expect(result.authenticated).toBe(true);
        expect(cookiesOf(ctx)).toEqual([]);
        expect(ctx.response.get('Cache-Control')).toBe('');
      });

      it("goes by the engine's word on where the session came from, not by the headers", async () => {
        const bearerSaysTheEngine = setup({
          lookup: signedIn({ source: 'bearer', setCookies: FRESH }),
        });
        const cookieSaysTheEngine = setup({
          lookup: signedIn({ source: 'cookie', setCookies: FRESH }),
        });
        const plain = koaCtx({ headers: { cookie: 'strapi.session_token=old.sig' } });
        const withHeader = koaCtx({ headers: { authorization: 'Bearer x', cookie: 'a=b' } });

        await bearerSaysTheEngine.strategy.authenticate(plain);
        await cookieSaysTheEngine.strategy.authenticate(withHeader);

        expect(cookiesOf(plain)).toEqual([]);
        expect(cookiesOf(withHeader)).toEqual(FRESH);
      });

      it('sets no cookie when the engine sent none', async () => {
        const { strategy } = setup({ lookup: signedIn() });
        const ctx = koaCtx({ headers: { cookie: 'strapi.session_token=old.sig' } });

        await strategy.authenticate(ctx);

        expect(cookiesOf(ctx)).toEqual([]);
        expect(ctx.response.get('Cache-Control')).toBe('');
      });
    });
  });

  describe('the class of a refusal', () => {
    // Core's `authorize` middleware turns any ForbiddenError that is not a PolicyError into a bare
    // `ctx.forbidden()`, and on a GET it wraps the Content API route (the public-files route runs
    // first). A PolicyError is the one that keeps its message and its `details.code` on a 403.
    it('is a PolicyError, still a 403, for each of the four coded refusals', async () => {
      const post = (origin?: string) =>
        koaCtx({
          method: 'POST',
          headers: { cookie: 'strapi.session_token=good.sig', ...(origin ? { origin } : {}) },
        });

      const outcomes = {
        USER_BANNED: await outcomeOf(
          setup({ lookup: signedIn(), user: storedUser({ banned: true }) }).strategy.authenticate(
            koaCtx()
          )
        ),
        TWO_FACTOR_REQUIRED: await outcomeOf(
          setup({
            lookup: signedIn(),
            held: [{ ...HELD[0], requireTwoFactor: true }],
            user: storedUser({ twoFactorEnabled: false }),
          }).strategy.authenticate(koaCtx())
        ),
        'ORIGIN_NOT_TRUSTED (not trusted)': await outcomeOf(
          setup({ lookup: signedIn() }).strategy.authenticate(post(UNTRUSTED))
        ),
        'ORIGIN_NOT_TRUSTED (missing)': await outcomeOf(
          setup({ lookup: signedIn() }).strategy.authenticate(post())
        ),
      };

      for (const [label, outcome] of Object.entries(outcomes)) {
        expect(outcome, label).toBeInstanceOf(errors.PolicyError);
        expect(outcome, label).toBeInstanceOf(errors.ForbiddenError);
        expect(outcome, label).toMatchObject({ name: 'PolicyError' });
        expect(codeOf(outcome), label).toEqual({ code: label.split(' ')[0] });
      }
    });

    it('is a bare ForbiddenError for the scope a route does not allow', () => {
      const { strategy } = setup();
      ABILITY.can.mockReturnValue(false);

      const verify = () =>
        strategy.verify(
          { credentials: { documentId: 'user-1' }, ability: ABILITY },
          { scope: 'api::note.note.find' }
        );

      expect(verify).toThrow(errors.ForbiddenError);
      expect(verify).not.toThrow(errors.PolicyError);
    });
  });

  describe('verify', () => {
    const user = { documentId: 'user-1' };

    it('lets a request through when the ability allows the scope of the route', () => {
      const { strategy } = setup();

      expect(() =>
        strategy.verify({ credentials: user, ability: ABILITY }, { scope: 'api::note.note.find' })
      ).not.toThrow();
      expect(ABILITY.can).toHaveBeenCalledWith('api::note.note.find');
    });

    it('refuses a scope the ability does not allow with 403', () => {
      const { strategy } = setup();
      ABILITY.can.mockReturnValue(false);

      expect(() =>
        strategy.verify({ credentials: user, ability: ABILITY }, { scope: 'api::note.note.find' })
      ).toThrow(errors.ForbiddenError);
    });

    it('needs every scope of a route to be allowed', () => {
      const { strategy } = setup();
      ABILITY.can.mockImplementation((action: string) => action === 'a.b.one');

      expect(() =>
        strategy.verify({ credentials: user, ability: ABILITY }, { scope: ['a.b.one', 'a.b.two'] })
      ).toThrow(errors.ForbiddenError);
      expect(() =>
        strategy.verify({ credentials: user, ability: ABILITY }, { scope: ['a.b.one'] })
      ).not.toThrow();
    });

    it('answers 403, not 401, to Public with nothing allowed', () => {
      const { strategy } = setup();
      ABILITY.can.mockReturnValue(false);

      const verify = () =>
        strategy.verify({ credentials: null, ability: ABILITY }, { scope: 'api::note.note.find' });

      expect(verify).toThrow(errors.ForbiddenError);
      expect(verify).not.toThrow(errors.UnauthorizedError);
    });

    it('lets Public through a scope it was given', () => {
      const { strategy } = setup();

      expect(() =>
        strategy.verify({ credentials: null, ability: ABILITY }, { scope: 'api::note.note.find' })
      ).not.toThrow();
    });

    it('verify allows permissions.forCaller without a grant and nothing else', () => {
      const { strategy } = setup();
      ABILITY.can.mockReturnValue(false);

      expect(ALWAYS_ALLOWED_SCOPES).toEqual(['plugin::end-users.permissions.forCaller']);

      for (const credentials of [user, null]) {
        const verify = (scope: string | string[]) => () =>
          strategy.verify({ credentials, ability: ABILITY }, { scope });

        expect(verify('plugin::end-users.permissions.forCaller')).not.toThrow();
        expect(verify(['plugin::end-users.permissions.forCaller'])).not.toThrow();
        expect(verify('api::note.note.find')).toThrow(errors.ForbiddenError);
        expect(verify(['plugin::end-users.permissions.forCaller', 'api::note.note.find'])).toThrow(
          errors.ForbiddenError
        );
      }

      // Never asked: the scope needs no grant
      expect(ABILITY.can).not.toHaveBeenCalledWith('plugin::end-users.permissions.forCaller');
    });

    it('keeps the always-allowed scopes fixed: the list is frozen', () => {
      expect(Object.isFrozen(ALWAYS_ALLOWED_SCOPES)).toBe(true);
      expect(() => (ALWAYS_ALLOWED_SCOPES as string[]).push('api::note.note.find')).toThrow(
        TypeError
      );
      expect(ALWAYS_ALLOWED_SCOPES).toEqual(['plugin::end-users.permissions.forCaller']);
    });

    it('answers 401 when there is no ability to ask', () => {
      const { strategy } = setup();

      expect(() =>
        strategy.verify({ credentials: user, ability: null }, { scope: 'api::note.note.find' })
      ).toThrow(errors.UnauthorizedError);
    });

    describe('a route without a scope', () => {
      it('is open to any signed-in user', () => {
        const { strategy } = setup();

        expect(() => strategy.verify({ credentials: user, ability: ABILITY }, {})).not.toThrow();
        expect(() =>
          strategy.verify({ credentials: user, ability: ABILITY }, undefined)
        ).not.toThrow();
      });

      it('is closed to Public, with 401: there is nobody to allow', () => {
        const { strategy } = setup();

        expect(() => strategy.verify({ credentials: null, ability: ABILITY }, {})).toThrow(
          errors.UnauthorizedError
        );
        expect(() => strategy.verify({ credentials: null, ability: ABILITY }, undefined)).toThrow(
          errors.UnauthorizedError
        );
      });
    });
  });

  describe('the legacy token bridge', () => {
    const bearer = (token = 'legacy-token') =>
      koaCtx({ headers: { authorization: `Bearer ${token}` } });
    const unknownBearer = (): SessionLookup => ({
      session: null,
      credentials: true,
      source: 'bearer',
      setCookies: [],
    });

    beforeEach(() => {
      vi.mocked(verifyLegacyBearer).mockReset().mockResolvedValue(null);
      vi.mocked(resolveLegacyUserId).mockReset().mockResolvedValue(null);
    });

    it('falls through to the legacy bridge only when until is in the future', async () => {
      vi.mocked(verifyLegacyBearer).mockResolvedValue({ kind: 'legacy', userId: '7', issuedAt: 1 });
      vi.mocked(resolveLegacyUserId).mockResolvedValue('user-1');
      const on = setup({ lookup: unknownBearer(), compat: true });
      const ctx = bearer();

      const result = await on.strategy.authenticate(ctx);

      expect(result).toMatchObject({ authenticated: true, credentials: { documentId: 'user-1' } });
      expect(ctx.state.user.documentId).toBe('user-1');
      expect(on.findOne).toHaveBeenCalledWith({ where: { documentId: 'user-1' } });
      expect(on.recordLegacyHit).toHaveBeenCalledWith('legacy');
      expect(verifyLegacyBearer).toHaveBeenCalledWith(
        expect.anything(),
        'legacy-token',
        expect.anything()
      );

      // With compat off the bridge is not asked at all
      vi.mocked(verifyLegacyBearer).mockClear();
      const off = setup({ lookup: unknownBearer(), compat: false });

      expect(await off.strategy.authenticate(bearer())).toMatchObject({ authenticated: false });
      expect(verifyLegacyBearer).not.toHaveBeenCalled();

      // A bridge that has closed (until passed) answers null, and the request is refused
      vi.mocked(verifyLegacyBearer).mockResolvedValue(null);
      const closed = setup({ lookup: unknownBearer(), compat: true });

      expect(await closed.strategy.authenticate(bearer())).toMatchObject({ authenticated: false });
      expect(closed.recordLegacyHit).not.toHaveBeenCalled();
    });

    it('does not ask the bridge when the engine found a session', async () => {
      const { strategy } = setup({ lookup: signedIn({ source: 'bearer' }), compat: true });

      await strategy.authenticate(bearer());

      expect(verifyLegacyBearer).not.toHaveBeenCalled();
    });

    it('answers 401 for a bad token and never falls back to Public', async () => {
      const { strategy, forUser, recordLegacyHit } = setup({
        lookup: unknownBearer(),
        compat: true,
      });

      const result = (await strategy.authenticate(bearer('nope'))) as {
        authenticated: boolean;
        error: Error;
      };

      expect(result.authenticated).toBe(false);
      expect(result.error).toBeInstanceOf(errors.UnauthorizedError);
      expect(forUser).not.toHaveBeenCalled();
      expect(recordLegacyHit).not.toHaveBeenCalled();
    });

    it('answers 401, and counts nothing, when the token names a user that is gone', async () => {
      vi.mocked(verifyLegacyBearer).mockResolvedValue({ kind: 'legacy', userId: '7', issuedAt: 1 });
      vi.mocked(resolveLegacyUserId).mockResolvedValue(null);
      const { strategy, recordLegacyHit } = setup({ lookup: unknownBearer(), compat: true });

      expect(await strategy.authenticate(bearer())).toMatchObject({ authenticated: false });
      expect(recordLegacyHit).not.toHaveBeenCalled();
    });

    it('refuses a banned user holding a valid legacy token with USER_BANNED', async () => {
      vi.mocked(verifyLegacyBearer).mockResolvedValue({
        kind: 'access',
        userId: '7',
        sessionId: 's-1',
        issuedAt: 1,
      });
      vi.mocked(resolveLegacyUserId).mockResolvedValue('user-1');
      const { strategy } = setup({
        lookup: unknownBearer(),
        compat: true,
        user: storedUser({ banned: true }),
      });

      expect(codeOf(await outcomeOf(strategy.authenticate(bearer())))).toEqual({
        code: 'USER_BANNED',
      });
    });
  });
});
