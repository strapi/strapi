import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import passport from 'koa-passport';
import { emitAudit, errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import authenticationController from '../authentication';
import { REFRESH_COOKIE_NAME, MFA_TRUST_COOKIE_NAME } from '../../../../shared/utils/session-auth';
import { MfaLockedError } from '../../services/mfa-errors';
// The real implementation, not a canned mock: used wherever a test needs to prove that a field
// `sanitizeUser` is supposed to strip (e.g. the MFA columns) actually never reaches an
// `admin.auth.*` event payload. A mock that always returns the same fixed object would make
// that kind of assertion vacuous -- it would pass even if the controller emitted the raw user.
import userService from '../../services/user';

const { sanitizeUser: realSanitizeUser } = userService;

vi.mock('@strapi/utils', async () => ({
  ...(await vi.importActual<typeof import('@strapi/utils')>('@strapi/utils')),
  emitAudit: vi.fn(async () => {}),
}));

vi.mock('koa-passport', async () => ({ __esModule: true, default: { authenticate: vi.fn() } }));

const getService = vi.hoisted(() => vi.fn());

vi.mock('../../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils')>();
  // Default to the real lookup, so the tests that build `strapi.admin.services` reach it; a
  // test can still stub a service with `getService.mockReturnValue(...)`.
  getService.mockImplementation(actual.getService);
  return { ...actual, getService: (...args: unknown[]) => getService(...args) };
});

const mockedAuthenticate = vi.mocked(passport.authenticate);

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
    vi.clearAllMocks();
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
      const generateRefreshToken = vi.fn(() =>
        Promise.resolve({ token: 'refresh-token', absoluteExpiresAt: undefined })
      );
      const generateAccessToken = vi.fn(() => Promise.resolve({ token: 'access-token' }));
      const invalidateRefreshToken = vi.fn(() => Promise.resolve());
      const sessionManagerFn = vi.fn(() => ({
        generateRefreshToken,
        generateAccessToken,
        invalidateRefreshToken,
      }));
      const sanitizeUser = vi.fn(() => sanitizedUser);
      const emit = vi.fn();
      const findOne = vi.fn(() => Promise.resolve(user));
      // Trusted devices defaults: trust offered at 30 days, no cookie ever matches, no grant. Tests that
      // are about trust override these.
      const trustedDeviceSettings = vi.fn(() => Promise.resolve({ enabled: true, days: 30 }));
      const consumeTrustedDevice = vi.fn(() => Promise.resolve(false));
      const trustDevice = vi.fn(() => Promise.resolve(null));
      // The real service stages the password of an enrolled account (see `completePasswordReset`).
      const resetPassword = vi.fn(async () => {
        const isEnabled = mfaOverrides.isEnabled as (() => boolean) | undefined;
        const isEnrolled = mfaOverrides.isEnrolled as (() => Promise<boolean>) | undefined;
        const staged = Boolean(isEnabled?.()) && Boolean(await isEnrolled?.());
        return { user, pendingPasswordHash: staged ? '$2a$staged' : null };
      });
      const commitStagedPasswordReset = vi.fn(() => Promise.resolve(user));

      setStrapi({
        eventHub: { emit },
        log: { error: vi.fn(), warn: vi.fn() },
        config: { get: vi.fn(() => undefined) },
        sessionManager: sessionManagerFn,
        admin: {
          services: {
            mfa: {
              claimRequestEvents: vi.fn(() => Promise.resolve()),
              enforce: vi.fn(() => Promise.resolve({ outcome: 'none' })),
              trustedDeviceSettings,
              consumeTrustedDevice,
              trustDevice,
              countPasskeys: vi.fn(() => Promise.resolve(0)),
              revokeAllTrustedDevices: vi.fn(() => Promise.resolve(0)),
              ...mfaOverrides,
            },
            user: { sanitizeUser, findOne, ...userOverrides },
            auth: { resetPassword, commitStagedPasswordReset },
          },
        },
      });

      return {
        commitStagedPasswordReset,
        generateRefreshToken,
        generateAccessToken,
        invalidateRefreshToken,
        sanitizeUser,
        emit,
        findOne,
        trustedDeviceSettings,
        consumeTrustedDevice,
        trustDevice,
      };
    };

    const buildCtx = (body: Record<string, unknown>, cookies: Record<string, string> = {}) => {
      const cookiesSet = vi.fn();
      const cookiesGet = vi.fn((name: string) => cookies[name]);
      const notFound = vi.fn();
      const internalServerError = vi.fn();
      const ctx = createContext(
        { body },
        {
          state: {},
          cookies: { set: cookiesSet, get: cookiesGet },
          notFound,
          internalServerError,
          // CreateContext only builds `request: { query, body }`; issueSession also reads
          // `request.headers` (session metadata) and `request.secure` (cookie options).
          request: { query: {}, body, headers: {}, secure: false },
        }
      ) as any;

      return { ctx, cookiesSet, cookiesGet, notFound };
    };

    // Shared by the 'trusted devices' and 'passkeys' blocks below: both need an
    // enrolled-and-challengeable mfa double, so it is scoped outside either of them.
    const enrolledMfa = (overrides: Record<string, unknown> = {}) => ({
      isEnabled: vi.fn(() => true),
      isEnrolled: vi.fn(() => Promise.resolve(true)),
      createChallenge: vi.fn(() => Promise.resolve({ token: 'challenge-token', expiresIn: 300 })),
      countPasskeys: vi.fn(() => Promise.resolve(0)),
      // `passkeyAvailableFor` ANDs this with `countPasskeys > 0`, so it is only ever reached
      // (and only ever needs a stub) when a test overrides `countPasskeys` to something truthy.
      passkeysConfigured: vi.fn(() => true),
      ...overrides,
    });

    test('an enrolled user receives a challenge and no session cookie', async () => {
      mockPassportUser(user);

      const isEnrolled = vi.fn(() => Promise.resolve(true));
      const createChallenge = vi.fn(() =>
        Promise.resolve({ token: 'challenge-token', expiresIn: 300 })
      );
      const emit = vi.fn();

      // Deliberately no sessionManager/config on strapi: reaching for either on this path would
      // throw, which is itself proof that the branch never tries to mint a session.
      setStrapi({
        eventHub: { emit },
        log: { error: vi.fn() },
        admin: {
          services: {
            mfa: {
              claimRequestEvents: vi.fn(() => Promise.resolve()),
              isEnabled: vi.fn(() => true),
              isEnrolled,
              createChallenge,
              enforce: vi.fn(() => Promise.resolve({ outcome: 'none' })),
              trustedDeviceSettings: vi.fn(() => Promise.resolve({ enabled: true, days: 30 })),
              countPasskeys: vi.fn(() => Promise.resolve(0)),
            },
            user: { sanitizeUser: vi.fn(realSanitizeUser) },
          },
        },
      });

      const { ctx, cookiesSet } = buildCtx({ email: user.email, password: 'Password123' });

      await authenticationController.login(ctx, vi.fn());

      expect(isEnrolled).toHaveBeenCalledWith(String(user.id));
      expect(createChallenge).toHaveBeenCalledWith(String(user.id));

      // The property the whole challenge step rests on: no cookie, no token, no accessToken
      // alongside mfaRequired. A cookie set here would make the feature a silent no-op.
      expect(cookiesSet).not.toHaveBeenCalled();
      expect(ctx.body).toEqual({
        data: {
          mfaRequired: true,
          challengeToken: 'challenge-token',
          expiresIn: 300,
          trustedDeviceDays: 30,
          passkeyAvailable: false,
        },
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
      const verifyChallenge = vi.fn(() => Promise.resolve({ ok: true, userId: '7' }));
      const { generateRefreshToken, generateAccessToken, emit } = buildIssuingStrapi(
        { isEnabled: vi.fn(() => true), verifyChallenge },
        { sanitizeUser: vi.fn(realSanitizeUser) }
      );

      const { ctx, cookiesSet } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

      await authenticationController.loginMfa(ctx, vi.fn());

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
      const verifyChallenge = vi.fn(() => Promise.resolve({ ok: true, userId: '7' }));
      buildIssuingStrapi({
        isEnabled: vi.fn(() => true),
        verifyChallenge,
      });

      // `.trim()` was dropped from the yup schema (it asserts under `strict: true` instead of
      // transforming), so the handler must trim `code` itself before calling `verifyChallenge`.
      const { ctx } = buildCtx({ challengeToken: 'challenge-token', code: ' 123456 ' });

      await authenticationController.loginMfa(ctx, vi.fn());

      expect(verifyChallenge).toHaveBeenCalledWith('challenge-token', '123456');
    });

    test('rememberMe on /login/mfa mints a refresh-type session', async () => {
      const verifyChallenge = vi.fn(() => Promise.resolve({ ok: true, userId: '7' }));
      const { generateRefreshToken } = buildIssuingStrapi({
        isEnabled: vi.fn(() => true),
        verifyChallenge,
      });

      const { ctx } = buildCtx({
        challengeToken: 'challenge-token',
        code: '123456',
        rememberMe: true,
      });

      await authenticationController.loginMfa(ctx, vi.fn());

      expect(generateRefreshToken).toHaveBeenCalledWith(
        String(user.id),
        expect.any(String),
        expect.objectContaining({ type: 'refresh' })
      );
    });

    test('a challengeToken over 64 characters is rejected before verifyChallenge runs', async () => {
      const verifyChallenge = vi.fn();
      buildIssuingStrapi({
        isEnabled: vi.fn(() => true),
        verifyChallenge,
      });

      // 32 random bytes hex-encoded is always exactly 64 characters (see `admin::mfa`).
      const { ctx } = buildCtx({ challengeToken: 'a'.repeat(65), code: '123456' });

      await expect(authenticationController.loginMfa(ctx, vi.fn())).rejects.toMatchObject({
        name: 'ValidationError',
      });
      expect(verifyChallenge).not.toHaveBeenCalled();
    });

    describe('loginMfa re-checks the account before issuing a session', () => {
      test('a null user (deleted since the challenge was issued) is rejected generically', async () => {
        const verifyChallenge = vi.fn(() => Promise.resolve({ ok: true, userId: '7' }));
        const { emit } = buildIssuingStrapi(
          { isEnabled: vi.fn(() => true), verifyChallenge },
          { findOne: vi.fn(() => Promise.resolve(null)) }
        );

        const { ctx, cookiesSet } = buildCtx({
          challengeToken: 'challenge-token',
          code: '123456',
        });

        await expect(authenticationController.loginMfa(ctx, vi.fn())).rejects.toMatchObject({
          name: 'ValidationError',
          message: 'Invalid code',
        });
        expect(cookiesSet).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalledWith('admin.auth.success', expect.anything());
      });

      test('an account deactivated during the challenge window is rejected generically', async () => {
        // Mirrors services/auth.ts `checkCredentials`, which rejects on `isActive !== true` --
        // and nothing else (it does not consult `blocked`).
        const verifyChallenge = vi.fn(() => Promise.resolve({ ok: true, userId: '7' }));
        const { emit } = buildIssuingStrapi(
          { isEnabled: vi.fn(() => true), verifyChallenge },
          { findOne: vi.fn(() => Promise.resolve({ ...user, isActive: false })) }
        );

        const { ctx, cookiesSet } = buildCtx({
          challengeToken: 'challenge-token',
          code: '123456',
        });

        await expect(authenticationController.loginMfa(ctx, vi.fn())).rejects.toMatchObject({
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
          const verifyChallenge = vi.fn(() => Promise.resolve({ ok: false as const, reason }));
          buildIssuingStrapi({ isEnabled: vi.fn(() => true), verifyChallenge });

          const { ctx } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

          const error = await authenticationController
            .loginMfa(ctx, vi.fn())
            .catch((e: unknown) => e);

          // Strict assertions, not `rejects.toMatchObject`: `toMatchObject` does a subset match
          // on nested objects, so `details: {}` there would still pass even if `details` were
          // `{ reason: 'unusable' }` -- exactly the enumeration leak this test exists to catch.
          // `toEqual` fails on any extra key. The code is the same for every reason, so it is
          // translatable without telling the caller which one it was.
          expect(error).toBeInstanceOf(errors.ValidationError);
          expect((error as InstanceType<typeof errors.ValidationError>).message).toBe(
            'Invalid code'
          );
          expect((error as InstanceType<typeof errors.ValidationError>).details).toEqual({
            code: 'MFA_INVALID_CODE',
          });
        }
      );

      test('reason "throttled" throws RateLimitError instead of ValidationError', async () => {
        const verifyChallenge = vi.fn(() =>
          Promise.resolve({ ok: false as const, reason: 'throttled' as const })
        );
        buildIssuingStrapi({ isEnabled: vi.fn(() => true), verifyChallenge });

        const { ctx } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

        await expect(authenticationController.loginMfa(ctx, vi.fn())).rejects.toMatchObject({
          name: 'RateLimitError',
        });
      });
    });

    test('a user without mfa logs in exactly as before', async () => {
      mockPassportUser(user);

      const isEnrolled = vi.fn(() => Promise.resolve(false));
      const createChallenge = vi.fn();
      const { generateRefreshToken, generateAccessToken, emit } = buildIssuingStrapi({
        isEnabled: vi.fn(() => true),
        isEnrolled,
        createChallenge,
      });

      const { ctx, cookiesSet } = buildCtx({ email: user.email, password: 'Password123' });

      await authenticationController.login(ctx, vi.fn());

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

      const isEnrolled = vi.fn(() => Promise.resolve(true));
      const createChallenge = vi.fn();
      const { generateRefreshToken, emit } = buildIssuingStrapi({
        isEnabled: vi.fn(() => false),
        isEnrolled,
        createChallenge,
      });

      const { ctx, cookiesSet } = buildCtx({ email: user.email, password: 'Password123' });

      await authenticationController.login(ctx, vi.fn());

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

    // The feature-off 404 is the `admin::isMfaEnabled` policy's job, not this handler's --
    // `routes/__tests__/authentication.vitest.test.ts` pins that the three `/login/mfa*` routes carry
    // it, and `policies/__tests__/isMfaEnabled.vitest.test.ts` pins what it does. A policy runs before
    // the handler, so it also still runs before body validation.

    describe('login with enforcement', () => {
      const user = { id: 7, email: 'admin@example.com', password: 'hashed', isActive: true };
      const graceUntil = new Date('2026-09-11T10:00:00.000Z');

      test('a graced user gets a session whose body carries the deadline', async () => {
        mockPassportUser(user);
        const enforce = vi.fn(() => Promise.resolve({ outcome: 'grace', graceUntil }));
        const { generateRefreshToken } = buildIssuingStrapi({
          isEnabled: () => true,
          isEnrolled: vi.fn(() => Promise.resolve(false)),
          enforce,
        });
        const { ctx } = buildCtx({ email: user.email, password: 'pw' });

        await authenticationController.login(ctx, vi.fn());

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
          isEnrolled: vi.fn(() => Promise.resolve(false)),
          enforce: vi.fn(() => Promise.resolve({ outcome: 'refused' })),
        });
        const { ctx, cookiesSet } = buildCtx({ email: user.email, password: 'pw' });

        await expect(authenticationController.login(ctx, vi.fn())).rejects.toBeInstanceOf(
          MfaLockedError
        );

        expect(generateRefreshToken).not.toHaveBeenCalled();
        expect(cookiesSet).not.toHaveBeenCalled();
        expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
          error: expect.any(MfaLockedError),
          provider: 'local',
          reason: 'mfa_locked',
          user: { id: user.id, email: user.email },
        });
        expect(emit).not.toHaveBeenCalledWith('admin.auth.success', expect.anything());
      });

      test('enforcement runs before the challenge branch and an enrolled user still gets a challenge', async () => {
        mockPassportUser(user);
        const enforce = vi.fn(() => Promise.resolve({ outcome: 'none' }));
        const createChallenge = vi.fn(() => Promise.resolve({ token: 'c', expiresIn: 300 }));
        buildIssuingStrapi({
          isEnabled: () => true,
          isEnrolled: vi.fn(() => Promise.resolve(true)),
          createChallenge,
          enforce,
        });
        const { ctx } = buildCtx({ email: user.email, password: 'pw' });

        await authenticationController.login(ctx, vi.fn());

        expect(enforce.mock.invocationCallOrder[0]).toBeLessThan(
          createChallenge.mock.invocationCallOrder[0]
        );
        expect(ctx.body).toEqual({
          data: {
            mfaRequired: true,
            challengeToken: 'c',
            expiresIn: 300,
            trustedDeviceDays: 30,
            passkeyAvailable: false,
          },
        });
      });
    });

    describe('trusted devices', () => {
      test('an enrolled user with a live trust cookie gets a session and no challenge', async () => {
        mockPassportUser(user);
        const consumeTrustedDevice = vi.fn(() => Promise.resolve(true));
        const createChallenge = vi.fn();
        const { generateRefreshToken, emit } = buildIssuingStrapi(
          enrolledMfa({ consumeTrustedDevice, createChallenge })
        );
        const { ctx, cookiesSet } = buildCtx(
          { email: user.email, password: 'Password123' },
          { [MFA_TRUST_COOKIE_NAME]: 'trust-token' }
        );

        await authenticationController.login(ctx, vi.fn());

        expect(consumeTrustedDevice).toHaveBeenCalledWith(String(user.id), 'trust-token');
        expect(createChallenge).not.toHaveBeenCalled();
        expect(generateRefreshToken).toHaveBeenCalled();
        expect((ctx.body as any).data.mfaRequired).toBeUndefined();
        expect((ctx.body as any).data.token).toBe('access-token');
        expect(emit).toHaveBeenCalledWith(
          'admin.auth.success',
          expect.objectContaining({ provider: 'local' })
        );
        // The trust cookie is left alone; only the refresh cookie is written.
        expect(cookiesSet).toHaveBeenCalledTimes(1);
        expect(cookiesSet).toHaveBeenCalledWith(
          REFRESH_COOKIE_NAME,
          'refresh-token',
          expect.any(Object)
        );
      });

      test('a trust cookie that matches nothing is cleared and the challenge follows', async () => {
        mockPassportUser(user);
        const consumeTrustedDevice = vi.fn(() => Promise.resolve(false));
        const { generateRefreshToken } = buildIssuingStrapi(enrolledMfa({ consumeTrustedDevice }));
        const { ctx, cookiesSet } = buildCtx(
          { email: user.email, password: 'Password123' },
          { [MFA_TRUST_COOKIE_NAME]: 'stale-token' }
        );

        await authenticationController.login(ctx, vi.fn());

        expect(consumeTrustedDevice).toHaveBeenCalledWith(String(user.id), 'stale-token');
        expect(cookiesSet).toHaveBeenCalledTimes(1);
        expect(cookiesSet).toHaveBeenCalledWith(
          MFA_TRUST_COOKIE_NAME,
          '',
          expect.objectContaining({ expires: new Date(0) })
        );
        expect(generateRefreshToken).not.toHaveBeenCalled();
        expect(ctx.body).toEqual({
          data: {
            mfaRequired: true,
            challengeToken: 'challenge-token',
            expiresIn: 300,
            trustedDeviceDays: 30,
            passkeyAvailable: false,
          },
        });
      });

      test('without a cookie the challenge is issued and the trust lookup never runs', async () => {
        mockPassportUser(user);
        const consumeTrustedDevice = vi.fn();
        buildIssuingStrapi(enrolledMfa({ consumeTrustedDevice }));
        const { ctx, cookiesSet } = buildCtx({ email: user.email, password: 'Password123' });

        await authenticationController.login(ctx, vi.fn());

        expect(consumeTrustedDevice).not.toHaveBeenCalled();
        expect(cookiesSet).not.toHaveBeenCalled();
        expect((ctx.body as any).data.mfaRequired).toBe(true);
      });

      test('the challenge advertises null when the organisation does not offer trust', async () => {
        mockPassportUser(user);
        buildIssuingStrapi(
          enrolledMfa({
            trustedDeviceSettings: vi.fn(() => Promise.resolve({ enabled: false, days: 30 })),
          })
        );
        const { ctx } = buildCtx({ email: user.email, password: 'Password123' });

        await authenticationController.login(ctx, vi.fn());

        expect((ctx.body as any).data.trustedDeviceDays).toBeNull();
      });

      test('a locked account is refused before the trust cookie is consulted', async () => {
        mockPassportUser(user);
        const consumeTrustedDevice = vi.fn(() => Promise.resolve(true));
        buildIssuingStrapi(
          enrolledMfa({
            consumeTrustedDevice,
            enforce: vi.fn(() => Promise.resolve({ outcome: 'refused' })),
          })
        );
        const { ctx } = buildCtx(
          { email: user.email, password: 'Password123' },
          { [MFA_TRUST_COOKIE_NAME]: 'trust-token' }
        );

        await expect(authenticationController.login(ctx, vi.fn())).rejects.toBeInstanceOf(
          MfaLockedError
        );
        expect(consumeTrustedDevice).not.toHaveBeenCalled();
      });

      test('an unenrolled user is never asked for a cookie', async () => {
        mockPassportUser(user);
        const consumeTrustedDevice = vi.fn();
        buildIssuingStrapi(
          enrolledMfa({ isEnrolled: vi.fn(() => Promise.resolve(false)), consumeTrustedDevice })
        );
        const { ctx, cookiesGet } = buildCtx(
          { email: user.email, password: 'Password123' },
          { [MFA_TRUST_COOKIE_NAME]: 'trust-token' }
        );

        await authenticationController.login(ctx, vi.fn());

        expect(cookiesGet).not.toHaveBeenCalled();
        expect(consumeTrustedDevice).not.toHaveBeenCalled();
      });

      test('/login/mfa with trustDevice grants trust and sets the cookie beside the session', async () => {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const trustDevice = vi.fn(() => Promise.resolve({ token: 'trust-token', expiresAt }));
        const verifyChallenge = vi.fn(() => Promise.resolve({ ok: true, userId: '7' }));
        buildIssuingStrapi({ isEnabled: vi.fn(() => true), verifyChallenge, trustDevice });
        const { ctx, cookiesSet } = buildCtx({
          challengeToken: 'challenge-token',
          code: '123456',
          trustDevice: true,
          deviceId: '11111111-1111-4111-8111-111111111111',
        });
        ctx.request.headers['user-agent'] = 'jest-agent';

        await authenticationController.loginMfa(ctx, vi.fn());

        expect(trustDevice).toHaveBeenCalledWith(String(user.id), {
          deviceId: '11111111-1111-4111-8111-111111111111',
          userAgent: 'jest-agent',
        });
        expect(cookiesSet).toHaveBeenCalledWith(
          MFA_TRUST_COOKIE_NAME,
          'trust-token',
          expect.objectContaining({ httpOnly: true, expires: expiresAt })
        );
        expect(cookiesSet).toHaveBeenCalledWith(
          REFRESH_COOKIE_NAME,
          'refresh-token',
          expect.any(Object)
        );
        expect((ctx.body as any).data.token).toBe('access-token');
      });

      test('/login/mfa ignores trustDevice when the organisation does not offer trust', async () => {
        const trustDevice = vi.fn(() => Promise.resolve(null));
        const verifyChallenge = vi.fn(() => Promise.resolve({ ok: true, userId: '7' }));
        buildIssuingStrapi({ isEnabled: vi.fn(() => true), verifyChallenge, trustDevice });
        const { ctx, cookiesSet } = buildCtx({
          challengeToken: 'challenge-token',
          code: '123456',
          trustDevice: true,
        });

        await authenticationController.loginMfa(ctx, vi.fn());

        expect(trustDevice).toHaveBeenCalled();
        expect(cookiesSet).toHaveBeenCalledTimes(1);
        expect(cookiesSet).toHaveBeenCalledWith(
          REFRESH_COOKIE_NAME,
          'refresh-token',
          expect.any(Object)
        );
        expect((ctx.body as any).data.token).toBe('access-token');
      });

      test('/login/mfa without trustDevice grants nothing', async () => {
        const trustDevice = vi.fn();
        const verifyChallenge = vi.fn(() => Promise.resolve({ ok: true, userId: '7' }));
        buildIssuingStrapi({ isEnabled: vi.fn(() => true), verifyChallenge, trustDevice });
        const { ctx } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

        await authenticationController.loginMfa(ctx, vi.fn());

        expect(trustDevice).not.toHaveBeenCalled();
      });

      test('/login/mfa rejects a non-boolean trustDevice before verifying anything', async () => {
        const verifyChallenge = vi.fn();
        buildIssuingStrapi({ isEnabled: vi.fn(() => true), verifyChallenge });
        const { ctx } = buildCtx({
          challengeToken: 'challenge-token',
          code: '123456',
          trustDevice: 'yes',
        });

        await expect(authenticationController.loginMfa(ctx, vi.fn())).rejects.toMatchObject({
          name: 'ValidationError',
        });
        expect(verifyChallenge).not.toHaveBeenCalled();
      });

      test('/reset-password: an enrolled user gets a challenge advertising the trust period, and the cookie is never read', async () => {
        const createChallenge = vi.fn(() =>
          Promise.resolve({ token: 'challenge-token', expiresIn: 300 })
        );
        const consumeTrustedDevice = vi.fn(() => Promise.resolve(true));
        const { generateRefreshToken } = buildIssuingStrapi(
          enrolledMfa({ createChallenge, consumeTrustedDevice })
        );
        const { ctx, cookiesGet } = buildCtx(
          { resetPasswordToken: 'reset-token', password: 'NewPassword123' },
          { [MFA_TRUST_COOKIE_NAME]: 'trust-token' }
        );

        await authenticationController.resetPassword(ctx);

        expect(cookiesGet).not.toHaveBeenCalled();
        expect(consumeTrustedDevice).not.toHaveBeenCalled();
        expect(generateRefreshToken).not.toHaveBeenCalled();
        expect(ctx.body).toEqual({
          data: {
            mfaRequired: true,
            challengeToken: 'challenge-token',
            expiresIn: 300,
            trustedDeviceDays: 30,
            passkeyAvailable: false,
          },
        });
      });

      test('/reset-password of an unenrolled user ends every session before issuing its own', async () => {
        // Trusted devices go with the password change itself (`updateById`), not here.
        const { invalidateRefreshToken, generateRefreshToken } = buildIssuingStrapi({
          isEnabled: vi.fn(() => false),
        });
        const { ctx } = buildCtx({ resetPasswordToken: 'reset-token', password: 'NewPassword123' });

        await authenticationController.resetPassword(ctx);

        expect(invalidateRefreshToken).toHaveBeenCalledWith(String(user.id));
        expect(invalidateRefreshToken.mock.invocationCallOrder[0]).toBeLessThan(
          generateRefreshToken.mock.invocationCallOrder[0]
        );
      });

      test('/login/mfa commits a reset staged on the challenge, before granting trust', async () => {
        // The new password exists only on the challenge until the second factor passes. The commit
        // revokes every trusted browser, so it must run before this browser is trusted.
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const trustDevice = vi.fn(() => Promise.resolve({ token: 'trust-token', expiresAt }));
        const verifyChallenge = vi.fn(() =>
          Promise.resolve({ ok: true, userId: '7', pendingPasswordHash: '$2a$staged' })
        );
        const { commitStagedPasswordReset, generateRefreshToken } = buildIssuingStrapi({
          isEnabled: vi.fn(() => true),
          verifyChallenge,
          trustDevice,
        });
        const { ctx } = buildCtx({
          challengeToken: 'challenge-token',
          code: '123456',
          trustDevice: true,
          rememberMe: true,
        });

        await authenticationController.loginMfa(ctx, vi.fn());

        expect(commitStagedPasswordReset).toHaveBeenCalledWith(user.id, '$2a$staged');
        expect(commitStagedPasswordReset.mock.invocationCallOrder[0]).toBeLessThan(
          trustDevice.mock.invocationCallOrder[0]
        );
        // A reset's session, as for an unenrolled reset: non-persistent, whatever the body asked.
        expect(generateRefreshToken).toHaveBeenCalledWith(
          String(user.id),
          expect.any(String),
          expect.objectContaining({ type: 'session' })
        );
      });

      test('/login/mfa commits nothing for an ordinary login', async () => {
        const verifyChallenge = vi.fn(() => Promise.resolve({ ok: true, userId: '7' }));
        const { commitStagedPasswordReset } = buildIssuingStrapi({
          isEnabled: vi.fn(() => true),
          verifyChallenge,
        });
        const { ctx } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

        await authenticationController.loginMfa(ctx, vi.fn());

        expect(commitStagedPasswordReset).not.toHaveBeenCalled();
      });
    });

    describe('passkeys', () => {
      // Shadows the outer fixture user deliberately, and with a different id: every assertion in
      // this block that names an id is checking the passkey path resolved *this* user, not the one
      // the enclosing describe blocks set up. A `findOne` override inside a test here has to
      // spread this one, not that one.
      const user = { id: 5, email: 'passkey-user@example.com', isActive: true };

      const webauthnMfa = (overrides: Record<string, unknown> = {}) => ({
        isEnabled: vi.fn(() => true),
        authenticationOptions: vi.fn(() => Promise.resolve({ challenge: 'auth-challenge' })),
        verifyAssertion: vi.fn(() => Promise.resolve({ userId: String(user.id) })),
        trustDevice: vi.fn(() => Promise.resolve(null)),
        ...overrides,
      });

      const body = (extra: Record<string, unknown> = {}) => ({
        challengeToken: 'c'.repeat(64),
        assertion: { id: 'cred-1', response: {} },
        ...extra,
      });

      test('the challenge advertises passkeyAvailable when the account holds one', async () => {
        mockPassportUser(user);
        buildIssuingStrapi(enrolledMfa({ countPasskeys: vi.fn(() => Promise.resolve(2)) }));
        const { ctx } = buildCtx({ email: user.email, password: 'Password123' });

        await authenticationController.login(ctx, vi.fn());

        expect((ctx.body as any).data.passkeyAvailable).toBe(true);
      });

      // `passkeyAvailable` is an AND, and this pins the half that is easy to drop: were it
      // `countPasskeys > 0` alone, a deployment whose RP cannot resolve would offer a "use a
      // passkey" button that every ceremony refuses. Holding a credential is not enough.
      test('passkeyAvailable is false when the account holds a credential but the RP cannot be resolved', async () => {
        mockPassportUser(user);
        const passkeysConfigured = vi.fn(() => false);
        buildIssuingStrapi(
          enrolledMfa({ countPasskeys: vi.fn(() => Promise.resolve(2)), passkeysConfigured })
        );
        const { ctx } = buildCtx({ email: user.email, password: 'Password123' });

        await authenticationController.login(ctx, vi.fn());

        expect(passkeysConfigured).toHaveBeenCalled();
        expect((ctx.body as any).data.passkeyAvailable).toBe(false);
      });

      test('the options route returns the library options for the submitted challenge token', async () => {
        const authenticationOptions = vi.fn(() =>
          Promise.resolve({ challenge: 'auth-challenge', rpId: 'cms.example.com' })
        );
        buildIssuingStrapi(webauthnMfa({ authenticationOptions }));
        // Not `body({ assertion: undefined })`: the options route's schema has no `assertion`
        // field at all, and an explicit `undefined` value is still an enumerable own key that
        // trips `.noUnknown()` -- this body must omit the key entirely, the way a real caller's
        // options request does.
        const { ctx } = buildCtx({ challengeToken: 'c'.repeat(64) });

        await authenticationController.loginMfaWebauthnOptions(ctx, vi.fn());

        expect(authenticationOptions).toHaveBeenCalledWith('c'.repeat(64));
        expect(ctx.body).toEqual({
          data: { challenge: 'auth-challenge', rpId: 'cms.example.com' },
        });
      });

      test('a passkey satisfies a staged reset too, and commits it', async () => {
        const doubles = buildIssuingStrapi(
          webauthnMfa({
            verifyAssertion: vi.fn(() =>
              Promise.resolve({ userId: String(user.id), pendingPasswordHash: '$2a$staged' })
            ),
          })
        );
        const { ctx } = buildCtx(body());

        await authenticationController.loginMfaWebauthn(ctx, vi.fn());

        expect(doubles.commitStagedPasswordReset).toHaveBeenCalledWith(
          expect.anything(),
          '$2a$staged'
        );
        expect(doubles.generateRefreshToken).toHaveBeenCalled();
      });

      test('a verified assertion issues a session and emits admin.auth.success', async () => {
        const doubles = buildIssuingStrapi(webauthnMfa());
        const { ctx } = buildCtx(body());

        await authenticationController.loginMfaWebauthn(ctx, vi.fn());

        expect(doubles.generateRefreshToken).toHaveBeenCalled();
        expect(doubles.emit).toHaveBeenCalledWith('admin.auth.success', {
          user: expect.any(Object),
          provider: 'local',
        });
      });

      test('a deactivated account is refused after the assertion and before any trust is granted', async () => {
        const trustDevice = vi.fn(() => Promise.resolve({ token: 't', expiresAt: new Date() }));
        const doubles = buildIssuingStrapi(webauthnMfa({ trustDevice }), {
          findOne: vi.fn(() => Promise.resolve({ ...user, isActive: false })),
        });
        const { ctx, cookiesSet } = buildCtx(body({ trustDevice: true }));

        await expect(authenticationController.loginMfaWebauthn(ctx, vi.fn())).rejects.toThrow(
          'Could not verify that passkey.'
        );

        expect(trustDevice).not.toHaveBeenCalled();
        expect(cookiesSet).not.toHaveBeenCalled();
        expect(doubles.generateRefreshToken).not.toHaveBeenCalled();
      });

      test('trustDevice grants and sets the cookie, byte for byte what /login/mfa does', async () => {
        const expiresAt = new Date(Date.now() + 1000);
        const trustDevice = vi.fn(() => Promise.resolve({ token: 'raw-trust-token', expiresAt }));
        // The default `findOne` double (defined in the outer scope) resolves the *outer* fixture
        // user (id 7), not this describe's own `user` (id 5) that `verifyAssertion` reports --
        // overridden here so the account this test recovers actually matches the id assertions
        // below check for.
        const doubles = buildIssuingStrapi(webauthnMfa({ trustDevice }), {
          findOne: vi.fn(() => Promise.resolve(user)),
        });
        const { ctx, cookiesSet } = buildCtx(
          body({ trustDevice: true, deviceId: '11111111-1111-4111-8111-111111111111' })
        );
        // A real header, exactly like the analogous `/login/mfa` trustDevice test -- and, per
        // Asserted against below exactly rather than with `expect.anything()`, which
        // would still pass if the controller hardcoded a literal `userAgent` instead of reading
        // it off the request.
        ctx.request.headers['user-agent'] = 'jest-agent';

        await authenticationController.loginMfaWebauthn(ctx, vi.fn());

        expect(trustDevice).toHaveBeenCalledWith(String(user.id), {
          deviceId: '11111111-1111-4111-8111-111111111111',
          userAgent: 'jest-agent',
        });
        // Exact `expires`, not `expect.any(Object)`: pins that the cookie carries the
        // service's own `expiresAt`, and `httpOnly`, byte for byte with the /login/mfa version of
        // this test.
        expect(cookiesSet).toHaveBeenCalledWith(
          MFA_TRUST_COOKIE_NAME,
          'raw-trust-token',
          expect.objectContaining({ httpOnly: true, expires: expiresAt })
        );
        // The submitted `deviceId` must reach `issueSession` itself (i.e.
        // `generateRefreshToken`'s device-id argument), not just `trustDevice` -- a handler that
        // minted its own fresh device id for the refresh token while still forwarding the
        // caller's to `trustDevice` would satisfy every assertion above but desynchronize the
        // trusted-device row from the session it is meant to cover.
        expect(doubles.generateRefreshToken).toHaveBeenCalledWith(
          String(user.id),
          '11111111-1111-4111-8111-111111111111',
          expect.any(Object)
        );
      });

      test('a stale trust checkbox is not an error: no cookie, still a session', async () => {
        const doubles = buildIssuingStrapi(webauthnMfa());
        const { ctx, cookiesSet } = buildCtx(body({ trustDevice: true }));

        await authenticationController.loginMfaWebauthn(ctx, vi.fn());

        expect(cookiesSet).not.toHaveBeenCalledWith(
          MFA_TRUST_COOKIE_NAME,
          expect.anything(),
          expect.anything()
        );
        expect(doubles.generateRefreshToken).toHaveBeenCalled();
      });

      test('rememberMe reaches issueSession through the body, not through a parameter', async () => {
        // Same reason as the trustDevice test above: override `findOne` so the recovered account
        // matches this describe's own `user` (id 5), not the outer fixture's (id 7).
        const doubles = buildIssuingStrapi(webauthnMfa(), {
          findOne: vi.fn(() => Promise.resolve(user)),
        });
        const { ctx } = buildCtx(body({ rememberMe: true }));

        await authenticationController.loginMfaWebauthn(ctx, vi.fn());

        expect(doubles.generateRefreshToken).toHaveBeenCalledWith(
          String(user.id),
          expect.any(String),
          expect.objectContaining({ type: 'refresh' })
        );
      });

      // The only coverage `mfaWebauthnOptionsSchema` and `mfaWebauthnLoginSchema` have: gutting
      // either (making `challengeToken`/`assertion` optional and unbounded) fails nothing else.
      // Controller-level, like the rest of this file's validator coverage, because the schemas
      // themselves are not exported -- only the wrapped `validate*` functions are.
      describe('webauthn validators', () => {
        test('loginMfaWebauthn: a missing assertion is rejected before verifyAssertion runs', async () => {
          const verifyAssertion = vi.fn();
          const doubles = buildIssuingStrapi(webauthnMfa({ verifyAssertion }));
          const { ctx } = buildCtx({ challengeToken: 'c'.repeat(64) });

          await expect(
            authenticationController.loginMfaWebauthn(ctx, vi.fn())
          ).rejects.toMatchObject({ name: 'ValidationError' });
          expect(verifyAssertion).not.toHaveBeenCalled();
          expect(doubles.generateRefreshToken).not.toHaveBeenCalled();
        });

        test('loginMfaWebauthn: assertion: null is rejected before verifyAssertion runs', async () => {
          const verifyAssertion = vi.fn();
          buildIssuingStrapi(webauthnMfa({ verifyAssertion }));
          const { ctx } = buildCtx(body({ assertion: null }));

          await expect(
            authenticationController.loginMfaWebauthn(ctx, vi.fn())
          ).rejects.toMatchObject({ name: 'ValidationError' });
          expect(verifyAssertion).not.toHaveBeenCalled();
        });

        test('loginMfaWebauthn: a challengeToken over 64 characters is rejected before verifyAssertion runs', async () => {
          const verifyAssertion = vi.fn();
          buildIssuingStrapi(webauthnMfa({ verifyAssertion }));
          const { ctx } = buildCtx(body({ challengeToken: 'c'.repeat(65) }));

          await expect(
            authenticationController.loginMfaWebauthn(ctx, vi.fn())
          ).rejects.toMatchObject({ name: 'ValidationError' });
          expect(verifyAssertion).not.toHaveBeenCalled();
        });

        test('loginMfaWebauthn: an unknown body key is rejected by .noUnknown() before verifyAssertion runs', async () => {
          const verifyAssertion = vi.fn();
          buildIssuingStrapi(webauthnMfa({ verifyAssertion }));
          const { ctx } = buildCtx(body({ userId: 99 }));

          await expect(
            authenticationController.loginMfaWebauthn(ctx, vi.fn())
          ).rejects.toMatchObject({ name: 'ValidationError' });
          expect(verifyAssertion).not.toHaveBeenCalled();
        });

        // `deviceId`/`rememberMe` are declared verbatim from `mfaLoginSchema`, so they must carry
        // the same constraints: a uuid-shaped `deviceId` and a boolean `rememberMe`.
        test('loginMfaWebauthn: a non-uuid deviceId is rejected, mirroring mfaLoginSchema', async () => {
          const verifyAssertion = vi.fn();
          buildIssuingStrapi(webauthnMfa({ verifyAssertion }));
          const { ctx } = buildCtx(body({ trustDevice: true, deviceId: 'not-a-uuid' }));

          await expect(
            authenticationController.loginMfaWebauthn(ctx, vi.fn())
          ).rejects.toMatchObject({ name: 'ValidationError' });
          expect(verifyAssertion).not.toHaveBeenCalled();
        });

        test('loginMfaWebauthn: a non-boolean rememberMe is rejected, mirroring mfaLoginSchema', async () => {
          const verifyAssertion = vi.fn();
          buildIssuingStrapi(webauthnMfa({ verifyAssertion }));
          const { ctx } = buildCtx(body({ rememberMe: 'yes' }));

          await expect(
            authenticationController.loginMfaWebauthn(ctx, vi.fn())
          ).rejects.toMatchObject({ name: 'ValidationError' });
          expect(verifyAssertion).not.toHaveBeenCalled();
        });

        test('loginMfaWebauthnOptions: a missing challengeToken is rejected before authenticationOptions runs', async () => {
          const authenticationOptions = vi.fn();
          buildIssuingStrapi(webauthnMfa({ authenticationOptions }));
          const { ctx } = buildCtx({});

          await expect(
            authenticationController.loginMfaWebauthnOptions(ctx, vi.fn())
          ).rejects.toMatchObject({ name: 'ValidationError' });
          expect(authenticationOptions).not.toHaveBeenCalled();
        });

        test('loginMfaWebauthnOptions: an unknown body key is rejected by .noUnknown() before authenticationOptions runs', async () => {
          const authenticationOptions = vi.fn();
          buildIssuingStrapi(webauthnMfa({ authenticationOptions }));
          // `mfaWebauthnOptionsSchema` has no `assertion` field at all -- a real caller of this
          // route never sends one, so an object value (not an explicit `undefined`, which trips
          // `.noUnknown()` for an unrelated reason -- see the options-route test above) proves the
          // schema itself rejects an extra key rather than merely a malformed one.
          const { ctx } = buildCtx({ challengeToken: 'c'.repeat(64), assertion: { id: 'cred-1' } });

          await expect(
            authenticationController.loginMfaWebauthnOptions(ctx, vi.fn())
          ).rejects.toMatchObject({ name: 'ValidationError' });
          expect(authenticationOptions).not.toHaveBeenCalled();
        });
      });
    });

    // Nothing else pins which user `countPasskeys` is asked about, that it runs before
    // `createChallenge` mints a row, or that the trusted-cookie fast path never pays for it at
    // all. Substituting a hardcoded `passkeyAvailableFor('999')`, or moving either read to after
    // its `createChallenge` call, leaves every other assertion in this file green.
    describe('passkeyAvailable: read timing, identity, and the trusted-cookie fast path', () => {
      test('login: countPasskeys is asked about this user, before createChallenge mints a row', async () => {
        mockPassportUser(user);
        const countPasskeys = vi.fn(() => Promise.resolve(0));
        const createChallenge = vi.fn(() =>
          Promise.resolve({ token: 'challenge-token', expiresIn: 300 })
        );
        buildIssuingStrapi(enrolledMfa({ countPasskeys, createChallenge }));
        const { ctx } = buildCtx({ email: user.email, password: 'Password123' });

        await authenticationController.login(ctx, vi.fn());

        expect(countPasskeys).toHaveBeenCalledWith(String(user.id));
        expect(countPasskeys.mock.invocationCallOrder[0]).toBeLessThan(
          createChallenge.mock.invocationCallOrder[0]
        );
      });

      test('login: a countPasskeys failure aborts before any challenge row is minted', async () => {
        mockPassportUser(user);
        const createChallenge = vi.fn(() =>
          Promise.resolve({ token: 'challenge-token', expiresIn: 300 })
        );
        buildIssuingStrapi(
          enrolledMfa({
            countPasskeys: vi.fn(() => Promise.reject(new Error('store unavailable'))),
            createChallenge,
          })
        );
        const { ctx } = buildCtx({ email: user.email, password: 'Password123' });

        await expect(authenticationController.login(ctx, vi.fn())).rejects.toThrow(
          'store unavailable'
        );
        expect(createChallenge).not.toHaveBeenCalled();
      });

      // A trusted browser must not pay for a value it discards.
      test('login: a live trust cookie never triggers countPasskeys at all', async () => {
        mockPassportUser(user);
        const countPasskeys = vi.fn(() => Promise.resolve(0));
        const consumeTrustedDevice = vi.fn(() => Promise.resolve(true));
        buildIssuingStrapi(enrolledMfa({ countPasskeys, consumeTrustedDevice }));
        const { ctx } = buildCtx(
          { email: user.email, password: 'Password123' },
          { [MFA_TRUST_COOKIE_NAME]: 'trust-token' }
        );

        await authenticationController.login(ctx, vi.fn());

        expect(consumeTrustedDevice).toHaveBeenCalledWith(String(user.id), 'trust-token');
        expect(countPasskeys).not.toHaveBeenCalled();
      });

      test('/reset-password: countPasskeys is asked about this user, before createChallenge mints a row', async () => {
        const countPasskeys = vi.fn(() => Promise.resolve(0));
        const createChallenge = vi.fn(() =>
          Promise.resolve({ token: 'challenge-token', expiresIn: 300 })
        );
        buildIssuingStrapi(enrolledMfa({ countPasskeys, createChallenge }));
        const { ctx } = buildCtx({ resetPasswordToken: 'reset-token', password: 'NewPassword123' });

        await authenticationController.resetPassword(ctx);

        expect(countPasskeys).toHaveBeenCalledWith(String(user.id));
        expect(countPasskeys.mock.invocationCallOrder[0]).toBeLessThan(
          createChallenge.mock.invocationCallOrder[0]
        );
      });

      test('/reset-password: a countPasskeys failure aborts before any challenge row is minted', async () => {
        const createChallenge = vi.fn(() =>
          Promise.resolve({ token: 'challenge-token', expiresIn: 300 })
        );
        buildIssuingStrapi(
          enrolledMfa({
            countPasskeys: vi.fn(() => Promise.reject(new Error('store unavailable'))),
            createChallenge,
          })
        );
        const { ctx } = buildCtx({ resetPasswordToken: 'reset-token', password: 'NewPassword123' });

        await expect(authenticationController.resetPassword(ctx)).rejects.toThrow(
          'store unavailable'
        );
        expect(createChallenge).not.toHaveBeenCalled();
      });
    });
  });

  describe('accessToken with enforcement', () => {
    const buildRefreshStrapi = (
      enforceResult: unknown,
      options: { sso?: boolean; enforceThrows?: boolean } = {}
    ) => {
      const calls: string[] = [];
      const validateRefreshToken = vi.fn(() =>
        Promise.resolve({ isValid: true, userId: '7', sessionId: 's1' })
      );
      const rotateRefreshToken = vi.fn(() => {
        calls.push('rotate');
        return Promise.resolve({
          token: 'rotated',
          sessionId: 's2',
          userId: '7',
          absoluteExpiresAt: undefined,
          type: 'refresh',
        });
      });
      const generateAccessToken = vi.fn(() => Promise.resolve({ token: 'access-token' }));
      const invalidateRefreshToken = vi.fn(() => Promise.resolve());
      const enforce = vi.fn(() => {
        calls.push('enforce');
        return options.enforceThrows
          ? Promise.reject(new Error('database went away'))
          : Promise.resolve(enforceResult);
      });
      const sessionFamily = vi.fn(() =>
        Promise.resolve({ familyId: 'f', startedAt: new Date(), sso: options.sso ?? false })
      );
      setStrapi({
        log: { error: vi.fn(), warn: vi.fn() },
        config: { get: vi.fn(() => undefined) },
        sessionManager: vi.fn(() => ({
          validateRefreshToken,
          rotateRefreshToken,
          generateAccessToken,
          invalidateRefreshToken,
        })),
        admin: { services: { mfa: { enforce, sessionFamily } } },
      });
      return {
        rotateRefreshToken,
        generateAccessToken,
        invalidateRefreshToken,
        enforce,
        sessionFamily,
        calls,
      };
    };

    const buildRefreshCtx = () => {
      const cookiesSet = vi.fn();
      const unauthorized = vi.fn((message: string) => {
        ctx.status = 401;
        ctx.body = { error: message };
      });
      const ctx: any = createContext(
        {},
        {
          state: {},
          cookies: { get: vi.fn(() => 'refresh-token'), set: cookiesSet },
          unauthorized,
          internalServerError: vi.fn(),
          request: { query: {}, body: {}, headers: {}, secure: false },
        }
      );
      return { ctx, cookiesSet, unauthorized };
    };

    test('a graced or unaffected user gets a fresh access token as before', async () => {
      const { enforce, generateAccessToken } = buildRefreshStrapi({ outcome: 'none' });
      const { ctx, cookiesSet } = buildRefreshCtx();

      await authenticationController.accessToken(ctx);

      expect(enforce).toHaveBeenCalledWith({ id: '7' });
      expect(generateAccessToken).toHaveBeenCalledWith('rotated');
      expect(cookiesSet).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'rotated', expect.any(Object));
      expect(ctx.body).toEqual({ data: { token: 'access-token' } });
    });

    test('a refused user: every session invalidated, cookie cleared, bare 401, no access token', async () => {
      const { generateAccessToken, invalidateRefreshToken } = buildRefreshStrapi({
        outcome: 'refused',
      });
      const { ctx, cookiesSet, unauthorized } = buildRefreshCtx();

      await authenticationController.accessToken(ctx);

      expect(invalidateRefreshToken).toHaveBeenCalledWith('7');
      expect(generateAccessToken).not.toHaveBeenCalled();
      expect(cookiesSet).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        '',
        expect.objectContaining({ expires: new Date(0) })
      );
      expect(unauthorized).toHaveBeenCalledWith('Invalid refresh token');
    });

    test('enforcement runs before the rotation, so a refused user never spends the token', async () => {
      const { calls, rotateRefreshToken } = buildRefreshStrapi({ outcome: 'refused' });
      const { ctx } = buildRefreshCtx();

      await authenticationController.accessToken(ctx);

      expect(calls).toEqual(['enforce']);
      expect(rotateRefreshToken).not.toHaveBeenCalled();
    });

    test('an enforcement error leaves the presented token unrotated, so a retry still works', async () => {
      const { rotateRefreshToken } = buildRefreshStrapi(undefined, { enforceThrows: true });
      const { ctx } = buildRefreshCtx();

      await authenticationController.accessToken(ctx);

      expect(ctx.internalServerError).toHaveBeenCalled();
      expect(rotateRefreshToken).not.toHaveBeenCalled();
    });

    test('an SSO login is not enforced on refresh: the identity provider owns its second factor', async () => {
      const { enforce, sessionFamily, generateAccessToken } = buildRefreshStrapi(
        { outcome: 'refused' },
        { sso: true }
      );
      const { ctx } = buildRefreshCtx();

      await authenticationController.accessToken(ctx);

      expect(sessionFamily).toHaveBeenCalledWith('s1');
      expect(enforce).not.toHaveBeenCalled();
      expect(generateAccessToken).toHaveBeenCalledWith('rotated');
    });
  });
});

const flush = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('Authentication controller, failed login', () => {
  const findOne = vi.fn();

  const login = async (err: unknown, user: unknown, info?: { message: string }) => {
    vi.mocked(passport.authenticate).mockImplementation(
      (_strategy: any, _options: any, callback: any) => () => callback(err, user, info)
    );

    const ctx = {
      request: { body: { email: 'Ana@Acme.com', password: 'Password123' } },
      state: {},
      notImplemented: vi.fn(),
    };

    const result = authenticationController
      .login(ctx as any, vi.fn())
      .catch((error: unknown) => error);
    const thrown = await result;
    await flush();

    return { ctx, thrown };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    findOne.mockResolvedValue({ id: 7, email: 'ana@acme.com' });

    global.strapi = {
      db: { query: vi.fn(() => ({ findOne })) },
      eventHub: { emit: vi.fn() },
      log: { error: vi.fn() },
    } as any;
  });

  test.each([
    ['Invalid credentials', 'invalid_credentials'],
    ['User not active', 'account_inactive'],
  ])('emits %s with the account found by lowercased email', async (message, reason) => {
    const { thrown } = await login(null, false, { message });

    expect(thrown).toBeInstanceOf(errors.ApplicationError);
    expect(findOne).toHaveBeenCalledWith({
      select: ['id', 'email'],
      where: { email: 'ana@acme.com' },
    });
    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
      error: new Error(message),
      provider: 'local',
      reason,
      user: { id: 7, email: 'ana@acme.com' },
    });
  });

  test('emits login_not_allowed for an SSO-locked account and rethrows the error', async () => {
    const lockedError = new errors.UnauthorizedError('Login not allowed', {
      code: 'LOGIN_NOT_ALLOWED',
    });

    const { thrown } = await login(lockedError, false);

    expect(thrown).toBe(lockedError);
    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
      error: lockedError,
      provider: 'local',
      reason: 'login_not_allowed',
      user: { id: 7, email: 'ana@acme.com' },
    });
  });

  test('emits unexpected_error for any other passport error and answers 501', async () => {
    const error = new Error('db down');

    const { ctx } = await login(error, false);

    expect(ctx.notImplemented).toHaveBeenCalled();
    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
      error,
      provider: 'local',
      reason: 'unexpected_error',
      user: { id: 7, email: 'ana@acme.com' },
    });
  });

  test('emits without an account when no user has that email', async () => {
    findOne.mockResolvedValue(null);

    await login(null, false, { message: 'Invalid credentials' });

    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'admin.auth.error', {
      error: new Error('Invalid credentials'),
      provider: 'local',
      reason: 'invalid_credentials',
    });
  });

  test('still emits, without an account, when the lookup fails', async () => {
    findOne.mockRejectedValue(new Error('db down'));

    await login(null, false, { message: 'Invalid credentials' });

    expect(emitAudit).toHaveBeenCalledWith(
      { strapi },
      'admin.auth.error',
      expect.not.objectContaining({ user: expect.anything() })
    );
  });
});

describe('Authentication controller, forgot password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('logs a background service rejection after Strapi teardown', async () => {
    const error = new Error('email failed');
    const logger = { error: vi.fn() };
    let reject!: (error: Error) => void;

    getService.mockReturnValue({
      forgotPassword: vi.fn(
        () =>
          new Promise<void>((_, rejectPromise) => {
            reject = rejectPromise;
          })
      ),
    });
    global.strapi = { log: logger } as any;

    const ctx = {
      request: { body: { email: 'admin@strapi.io' } },
      status: 0,
    };

    await authenticationController.forgotPassword(ctx as any);
    global.strapi = { plugins: {} } as any;
    reject(error);
    await flush();

    expect(ctx.status).toBe(204);
    expect(logger.error).toHaveBeenCalledWith('Failed to process the forgot-password request', {
      error,
    });
  });
});
