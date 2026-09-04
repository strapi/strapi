/* eslint-env jest */

import passport from 'koa-passport';
import { errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import authenticationController from '../authentication';
import { REFRESH_COOKIE_NAME } from '../../../../shared/utils/session-auth';
import { MfaLockedError } from '../../services/mfa-errors';
// The real implementation, not a canned mock: used wherever a test needs to prove that a field
// `sanitizeUser` is supposed to strip (e.g. the MFA columns) actually never reaches an
// `admin.auth.*` event payload. A mock that always returns the same fixed object would make
// that kind of assertion vacuous -- it would pass even if the controller emitted the raw user.
import userService from '../../services/user';

const { sanitizeUser: realSanitizeUser } = userService;

jest.mock('koa-passport', () => ({
  authenticate: jest.fn(),
}));

const mockedAuthenticate = jest.mocked(passport.authenticate);

const setStrapi = (value: object) => {
  (globalThis as any).strapi = value;
};

/**
 * `passport.authenticate(strategy, options, callback)` returns a middleware that koa-passport
 * calls as `(ctx, next)`. The real callback defined inline in `authentication.ts` closes over
 * `ctx`/`next` from its own outer function, so this mock only has to invoke the callback -- it
 * never needs to thread `ctx`/`next` through itself.
 */
const mockPassportUser = (user: unknown) => {
  mockedAuthenticate.mockImplementation(((..._args: unknown[]) => {
    const callback = _args[2] as (...cbArgs: unknown[]) => unknown;
    return () => callback(null, user, {});
  }) as typeof passport.authenticate);
};

describe('authentication controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login with mfa', () => {
    const user = {
      id: 7,
      email: 'admin@example.com',
      password: 'hashed',
      isActive: true,
      // Carried on every fixture so a test that switches to `realSanitizeUser` (below) has a
      // non-vacuous fixture to strip them from -- present here, and only here, matters for
      // tests that actually invoke the real sanitizer.
      mfaSecret: 'encrypted-secret-ciphertext',
      mfaEnabledAt: '2026-01-01T00:00:00.000Z',
      mfaLastUsedStep: 42,
    };
    const sanitizedUser = { id: 7, email: 'admin@example.com' };

    /**
     * A working session manager double for the paths that are expected to reach `issueSession`.
     * `strapi.config` and `strapi.log` are required too: `issueSession` -> `buildCookieOptionsWithExpiry`
     * -> `getRefreshCookieOptions` reads config, and `getAccessCookieDomain` logs through
     * `strapi.log.warn` on an invalid (not: absent) configured domain.
     */
    const buildIssuingStrapi = (
      mfaOverrides: Record<string, unknown>,
      userOverrides: Record<string, unknown> = {}
    ) => {
      const generateRefreshToken = jest.fn(() =>
        Promise.resolve({ token: 'refresh-token', absoluteExpiresAt: undefined })
      );
      const generateAccessToken = jest.fn(() => Promise.resolve({ token: 'access-token' }));
      const sessionManagerFn = jest.fn(() => ({ generateRefreshToken, generateAccessToken }));
      const sanitizeUser = jest.fn(() => sanitizedUser);
      const emit = jest.fn();
      const findOne = jest.fn(() => Promise.resolve(user));

      setStrapi({
        eventHub: { emit },
        log: { error: jest.fn(), warn: jest.fn() },
        config: { get: jest.fn(() => undefined) },
        sessionManager: sessionManagerFn,
        admin: {
          services: {
            mfa: { enforce: jest.fn(() => Promise.resolve({ outcome: 'none' })), ...mfaOverrides },
            user: { sanitizeUser, findOne, ...userOverrides },
          },
        },
      });

      return { generateRefreshToken, generateAccessToken, sanitizeUser, emit, findOne };
    };

    const buildCtx = (body: Record<string, unknown>) => {
      const cookiesSet = jest.fn();
      const notFound = jest.fn();
      const ctx = createContext(
        { body },
        {
          state: {},
          cookies: { set: cookiesSet },
          notFound,
          // createContext only builds `request: { query, body }`; issueSession also reads
          // `request.headers` (session metadata) and `request.secure` (cookie options).
          request: { query: {}, body, headers: {}, secure: false },
        }
      ) as any;

      return { ctx, cookiesSet, notFound };
    };

    test('an enrolled user receives a challenge and no session cookie', async () => {
      mockPassportUser(user);

      const isEnrolled = jest.fn(() => Promise.resolve(true));
      const createChallenge = jest.fn(() =>
        Promise.resolve({ token: 'challenge-token', expiresIn: 300 })
      );
      const emit = jest.fn();

      // Deliberately no sessionManager/config on strapi: reaching for either on this path would
      // throw, which is itself proof that the branch never tries to mint a session.
      //
      // `sanitizeUser` is the real implementation here, not a canned mock: `user` carries the
      // MFA columns, so the emit assertion below only means something if a leak would actually
      // survive it.
      setStrapi({
        eventHub: { emit },
        log: { error: jest.fn() },
        admin: {
          services: {
            mfa: {
              isEnabled: jest.fn(() => true),
              isEnrolled,
              createChallenge,
              enforce: jest.fn(() => Promise.resolve({ outcome: 'none' })),
            },
            user: { sanitizeUser: jest.fn(realSanitizeUser) },
          },
        },
      });

      const { ctx, cookiesSet } = buildCtx({ email: user.email, password: 'Password123' });

      await authenticationController.login(ctx, jest.fn());

      expect(isEnrolled).toHaveBeenCalledWith(String(user.id));
      expect(createChallenge).toHaveBeenCalledWith(String(user.id));

      // The property this task exists for: no cookie, no token, no accessToken alongside
      // mfaRequired. A cookie set here would make the whole feature a silent no-op.
      expect(cookiesSet).not.toHaveBeenCalled();
      expect(ctx.body).toEqual({
        data: { mfaRequired: true, challengeToken: 'challenge-token', expiresIn: 300 },
      });
      expect((ctx.body as any).data.token).toBeUndefined();
      expect((ctx.body as any).data.accessToken).toBeUndefined();

      // A gated login is visible to audit consumers as its own event, and must never look like
      // a completed login: `admin.auth.success` fires only when a session is actually issued.
      expect(emit).toHaveBeenCalledWith('admin.auth.mfa_required', {
        user: { id: user.id, email: user.email, isActive: user.isActive },
        provider: 'local',
      });

      const [, mfaRequiredPayload] = emit.mock.calls.find(
        ([eventName]) => eventName === 'admin.auth.mfa_required'
      )!;
      expect(mfaRequiredPayload.user).not.toHaveProperty('mfaSecret');
      expect(mfaRequiredPayload.user).not.toHaveProperty('mfaEnabledAt');
      expect(mfaRequiredPayload.user).not.toHaveProperty('mfaLastUsedStep');

      expect(emit).not.toHaveBeenCalledWith('admin.auth.success', expect.anything());
    });

    test('a valid code at /login/mfa issues the session', async () => {
      const verifyChallenge = jest.fn(() => Promise.resolve({ ok: true, userId: '7' }));
      // `sanitizeUser` is overridden to the real implementation here (the fixture `user` carries
      // the MFA columns), so the assertions below prove they never reach `ctx.body` or the
      // `admin.auth.success` payload, rather than trusting a canned mock that would pass either
      // way.
      const { generateRefreshToken, generateAccessToken, emit } = buildIssuingStrapi(
        { isEnabled: jest.fn(() => true), verifyChallenge },
        { sanitizeUser: jest.fn(realSanitizeUser) }
      );

      const { ctx, cookiesSet } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

      await authenticationController.loginMfa(ctx, jest.fn());

      const expectedUser = { id: user.id, email: user.email, isActive: user.isActive };

      expect(verifyChallenge).toHaveBeenCalledWith('challenge-token', '123456');
      expect(generateRefreshToken).toHaveBeenCalled();
      expect(generateAccessToken).toHaveBeenCalled();
      expect(cookiesSet).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'refresh-token',
        expect.any(Object)
      );
      expect(ctx.body).toEqual({
        data: { token: 'access-token', accessToken: 'access-token', user: expectedUser },
      });
      expect((ctx.body as any).data.user).not.toHaveProperty('mfaSecret');
      expect((ctx.body as any).data.user).not.toHaveProperty('mfaEnabledAt');
      expect((ctx.body as any).data.user).not.toHaveProperty('mfaLastUsedStep');

      expect(emit).toHaveBeenCalledWith('admin.auth.success', {
        user: expectedUser,
        provider: 'local',
      });
    });

    test('a code with surrounding whitespace reaches verifyChallenge trimmed', async () => {
      const verifyChallenge = jest.fn(() => Promise.resolve({ ok: true, userId: '7' }));
      buildIssuingStrapi({
        isEnabled: jest.fn(() => true),
        verifyChallenge,
      });

      // `.trim()` was dropped from the yup schema (it asserts under `strict: true` instead of
      // transforming), so the handler must trim `code` itself before calling `verifyChallenge`.
      const { ctx } = buildCtx({ challengeToken: 'challenge-token', code: ' 123456 ' });

      await authenticationController.loginMfa(ctx, jest.fn());

      expect(verifyChallenge).toHaveBeenCalledWith('challenge-token', '123456');
    });

    test('rememberMe on /login/mfa mints a refresh-type session', async () => {
      const verifyChallenge = jest.fn(() => Promise.resolve({ ok: true, userId: '7' }));
      const { generateRefreshToken } = buildIssuingStrapi({
        isEnabled: jest.fn(() => true),
        verifyChallenge,
      });

      const { ctx } = buildCtx({
        challengeToken: 'challenge-token',
        code: '123456',
        rememberMe: true,
      });

      await authenticationController.loginMfa(ctx, jest.fn());

      expect(generateRefreshToken).toHaveBeenCalledWith(
        String(user.id),
        expect.any(String),
        expect.objectContaining({ type: 'refresh' })
      );
    });

    test('a challengeToken over 64 characters is rejected before verifyChallenge runs', async () => {
      const verifyChallenge = jest.fn();
      buildIssuingStrapi({
        isEnabled: jest.fn(() => true),
        verifyChallenge,
      });

      // 32 random bytes hex-encoded is always exactly 64 characters (see `admin::mfa`).
      const { ctx } = buildCtx({ challengeToken: 'a'.repeat(65), code: '123456' });

      await expect(authenticationController.loginMfa(ctx, jest.fn())).rejects.toMatchObject({
        name: 'ValidationError',
      });
      expect(verifyChallenge).not.toHaveBeenCalled();
    });

    describe('loginMfa re-checks the account before issuing a session', () => {
      test('a null user (deleted since the challenge was issued) is rejected generically', async () => {
        const verifyChallenge = jest.fn(() => Promise.resolve({ ok: true, userId: '7' }));
        const { emit } = buildIssuingStrapi(
          { isEnabled: jest.fn(() => true), verifyChallenge },
          { findOne: jest.fn(() => Promise.resolve(null)) }
        );

        const { ctx, cookiesSet } = buildCtx({
          challengeToken: 'challenge-token',
          code: '123456',
        });

        await expect(authenticationController.loginMfa(ctx, jest.fn())).rejects.toMatchObject({
          name: 'ValidationError',
          message: 'Invalid code',
        });
        expect(cookiesSet).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalledWith('admin.auth.success', expect.anything());
      });

      test('an account deactivated during the challenge window is rejected generically', async () => {
        // Mirrors services/auth.ts `checkCredentials`, which rejects on `isActive !== true` --
        // and nothing else (it does not consult `blocked`).
        const verifyChallenge = jest.fn(() => Promise.resolve({ ok: true, userId: '7' }));
        const { emit } = buildIssuingStrapi(
          { isEnabled: jest.fn(() => true), verifyChallenge },
          { findOne: jest.fn(() => Promise.resolve({ ...user, isActive: false })) }
        );

        const { ctx, cookiesSet } = buildCtx({
          challengeToken: 'challenge-token',
          code: '123456',
        });

        await expect(authenticationController.loginMfa(ctx, jest.fn())).rejects.toMatchObject({
          name: 'ValidationError',
          message: 'Invalid code',
        });
        expect(cookiesSet).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalledWith('admin.auth.success', expect.anything());
      });
    });

    describe('verifyChallenge failure reasons collapse to two responses (anti-enumeration)', () => {
      test.each(['unusable', 'exhausted', 'invalid'] as const)(
        'reason "%s" throws the identical, generic ValidationError',
        async (reason) => {
          const verifyChallenge = jest.fn(() => Promise.resolve({ ok: false as const, reason }));
          buildIssuingStrapi({ isEnabled: jest.fn(() => true), verifyChallenge });

          const { ctx } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

          const error = await authenticationController
            .loginMfa(ctx, jest.fn())
            .catch((e: unknown) => e);

          // Strict assertions, not `rejects.toMatchObject`: `toMatchObject` does a subset match
          // on nested objects, so `details: {}` there would still pass even if `details` were
          // `{ reason: 'unusable' }` -- exactly the enumeration leak this test exists to catch.
          // `toEqual({})` fails on any extra key.
          expect(error).toBeInstanceOf(errors.ValidationError);
          expect((error as InstanceType<typeof errors.ValidationError>).message).toBe(
            'Invalid code'
          );
          expect((error as InstanceType<typeof errors.ValidationError>).details).toEqual({});
        }
      );

      test('reason "throttled" throws RateLimitError instead of ValidationError', async () => {
        const verifyChallenge = jest.fn(() =>
          Promise.resolve({ ok: false as const, reason: 'throttled' as const })
        );
        buildIssuingStrapi({ isEnabled: jest.fn(() => true), verifyChallenge });

        const { ctx } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

        await expect(authenticationController.loginMfa(ctx, jest.fn())).rejects.toMatchObject({
          name: 'RateLimitError',
        });
      });
    });

    test('a user without mfa logs in exactly as before', async () => {
      mockPassportUser(user);

      const isEnrolled = jest.fn(() => Promise.resolve(false));
      const createChallenge = jest.fn();
      const { generateRefreshToken, generateAccessToken, emit } = buildIssuingStrapi({
        isEnabled: jest.fn(() => true),
        isEnrolled,
        createChallenge,
      });

      const { ctx, cookiesSet } = buildCtx({ email: user.email, password: 'Password123' });

      await authenticationController.login(ctx, jest.fn());

      expect(isEnrolled).toHaveBeenCalledWith(String(user.id));
      expect(createChallenge).not.toHaveBeenCalled();
      expect(generateRefreshToken).toHaveBeenCalled();
      expect(generateAccessToken).toHaveBeenCalled();
      expect(cookiesSet).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'refresh-token',
        expect.any(Object)
      );
      expect(ctx.body).toEqual({
        data: { token: 'access-token', accessToken: 'access-token', user: sanitizedUser },
      });

      // Plain login still emits `admin.auth.success` exactly once, and nothing else on the
      // `admin.auth.*` channel.
      const authEvents = emit.mock.calls.filter(([eventName]) =>
        eventName.startsWith('admin.auth.')
      );
      expect(authEvents).toEqual([
        ['admin.auth.success', { user: sanitizedUser, provider: 'local' }],
      ]);
    });

    test('with the future flag off, an enrolled user logs in with the password alone', async () => {
      mockPassportUser(user);

      const isEnrolled = jest.fn(() => Promise.resolve(true));
      const createChallenge = jest.fn();
      const { generateRefreshToken, emit } = buildIssuingStrapi({
        isEnabled: jest.fn(() => false),
        isEnrolled,
        createChallenge,
      });

      const { ctx, cookiesSet } = buildCtx({ email: user.email, password: 'Password123' });

      await authenticationController.login(ctx, jest.fn());

      // isEnabled() short-circuits the `&&`, so isEnrolled must never even run.
      expect(isEnrolled).not.toHaveBeenCalled();
      expect(createChallenge).not.toHaveBeenCalled();
      expect(generateRefreshToken).toHaveBeenCalled();
      expect(cookiesSet).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'refresh-token',
        expect.any(Object)
      );
      expect(ctx.body).toEqual({
        data: { token: 'access-token', accessToken: 'access-token', user: sanitizedUser },
      });
      expect(emit).toHaveBeenCalledWith('admin.auth.success', {
        user: sanitizedUser,
        provider: 'local',
      });
      expect(emit).not.toHaveBeenCalledWith('admin.auth.mfa_required', expect.anything());
    });

    // M3: the flag check must run before body validation, matching `controllers/mfa.ts`'s
    // `requireEnabled` ordering -- otherwise flag-off returns 400 for a malformed body and 404 for
    // a well-formed one, which is itself a feature-presence tell (a 400 on a route that is
    // supposed to not exist reveals the validator behind it exists). A malformed body here (no
    // `code` at all) would throw a `ValidationError` if validation ran first; with the flag
    // checked first it must still be a plain 404, with validation never even reached.
    test('with the future flag off, POST /login/mfa returns 404 even for a malformed body', async () => {
      const verifyChallenge = jest.fn();

      setStrapi({
        log: { error: jest.fn() },
        admin: {
          services: {
            mfa: { isEnabled: jest.fn(() => false), verifyChallenge },
            user: { sanitizeUser: jest.fn(), findOne: jest.fn() },
          },
        },
      });

      // Missing `challengeToken` and `code` entirely -- `validateMfaLoginInput` would reject this
      // if it ever ran.
      const { ctx, notFound } = buildCtx({});

      await expect(authenticationController.loginMfa(ctx, jest.fn())).resolves.toBeUndefined();

      expect(notFound).toHaveBeenCalled();
      expect(verifyChallenge).not.toHaveBeenCalled();
    });

    describe('login with enforcement', () => {
      const user = { id: 7, email: 'admin@example.com', password: 'hashed', isActive: true };
      const graceUntil = new Date('2026-09-11T10:00:00.000Z');

      test('a graced user gets a session whose body carries the deadline', async () => {
        mockPassportUser(user);
        const enforce = jest.fn(() => Promise.resolve({ outcome: 'grace', graceUntil }));
        const { generateRefreshToken } = buildIssuingStrapi({
          isEnabled: () => true,
          isEnrolled: jest.fn(() => Promise.resolve(false)),
          enforce,
        });
        const { ctx } = buildCtx({ email: user.email, password: 'pw' });

        await authenticationController.login(ctx, jest.fn());

        expect(enforce).toHaveBeenCalledWith(user);
        expect(generateRefreshToken).toHaveBeenCalled();
        expect(ctx.body.data).toEqual(
          expect.objectContaining({
            token: 'access-token',
            mfaEnrolmentRequired: true,
            mfaGraceUntil: '2026-09-11T10:00:00.000Z',
          })
        );
      });

      test('a locked user is refused with MfaLockedError, no session, admin.auth.error emitted', async () => {
        mockPassportUser(user);
        const { generateRefreshToken, emit } = buildIssuingStrapi({
          isEnabled: () => true,
          isEnrolled: jest.fn(() => Promise.resolve(false)),
          enforce: jest.fn(() => Promise.resolve({ outcome: 'refused' })),
        });
        const { ctx, cookiesSet } = buildCtx({ email: user.email, password: 'pw' });

        await expect(authenticationController.login(ctx, jest.fn())).rejects.toBeInstanceOf(
          MfaLockedError
        );

        expect(generateRefreshToken).not.toHaveBeenCalled();
        expect(cookiesSet).not.toHaveBeenCalled();
        expect(emit).toHaveBeenCalledWith('admin.auth.error', {
          error: expect.any(MfaLockedError),
          provider: 'local',
        });
        expect(emit).not.toHaveBeenCalledWith('admin.auth.success', expect.anything());
      });

      test('enforcement runs before the challenge branch and an enrolled user still gets a challenge', async () => {
        mockPassportUser(user);
        const enforce = jest.fn(() => Promise.resolve({ outcome: 'none' }));
        const createChallenge = jest.fn(() => Promise.resolve({ token: 'c', expiresIn: 300 }));
        buildIssuingStrapi({
          isEnabled: () => true,
          isEnrolled: jest.fn(() => Promise.resolve(true)),
          createChallenge,
          enforce,
        });
        const { ctx } = buildCtx({ email: user.email, password: 'pw' });

        await authenticationController.login(ctx, jest.fn());

        expect(enforce.mock.invocationCallOrder[0]).toBeLessThan(
          createChallenge.mock.invocationCallOrder[0]
        );
        expect(ctx.body).toEqual({
          data: { mfaRequired: true, challengeToken: 'c', expiresIn: 300 },
        });
      });
    });
  });
});
