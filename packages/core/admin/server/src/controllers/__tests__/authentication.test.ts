/* eslint-env jest */

import passport from 'koa-passport';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import authenticationController from '../authentication';
import { REFRESH_COOKIE_NAME } from '../../../../shared/utils/session-auth';

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
    const user = { id: 7, email: 'admin@example.com', password: 'hashed' };
    const sanitizedUser = { id: 7, email: 'admin@example.com' };

    /**
     * A working session manager double for the paths that are expected to reach `issueSession`.
     * `strapi.config` and `strapi.log` are required too: `issueSession` -> `buildCookieOptionsWithExpiry`
     * -> `getRefreshCookieOptions` reads config, and `getAccessCookieDomain` logs through
     * `strapi.log.warn` on an invalid (not: absent) configured domain.
     */
    const buildIssuingStrapi = (mfaOverrides: Record<string, unknown>) => {
      const generateRefreshToken = jest.fn(() =>
        Promise.resolve({ token: 'refresh-token', absoluteExpiresAt: undefined })
      );
      const generateAccessToken = jest.fn(() => Promise.resolve({ token: 'access-token' }));
      const sessionManagerFn = jest.fn(() => ({ generateRefreshToken, generateAccessToken }));
      const sanitizeUser = jest.fn(() => sanitizedUser);

      setStrapi({
        eventHub: { emit: jest.fn() },
        log: { error: jest.fn(), warn: jest.fn() },
        config: { get: jest.fn(() => undefined) },
        sessionManager: sessionManagerFn,
        admin: {
          services: {
            mfa: mfaOverrides,
            user: { sanitizeUser, findOne: jest.fn(() => Promise.resolve(user)) },
          },
        },
      });

      return { generateRefreshToken, generateAccessToken, sanitizeUser };
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

      // Deliberately no sessionManager/config on strapi: reaching for either on this path would
      // throw, which is itself proof that the branch never tries to mint a session.
      setStrapi({
        eventHub: { emit: jest.fn() },
        log: { error: jest.fn() },
        admin: {
          services: {
            mfa: { isEnabled: jest.fn(() => true), isEnrolled, createChallenge },
            user: { sanitizeUser: jest.fn(() => sanitizedUser) },
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
    });

    test('a valid code at /login/mfa issues the session', async () => {
      const verifyChallenge = jest.fn(() => Promise.resolve({ ok: true, userId: '7' }));
      const { generateRefreshToken, generateAccessToken } = buildIssuingStrapi({
        isEnabled: jest.fn(() => true),
        verifyChallenge,
      });

      const { ctx, cookiesSet } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

      await authenticationController.loginMfa(ctx, jest.fn());

      expect(verifyChallenge).toHaveBeenCalledWith('challenge-token', '123456');
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
    });

    test('a user without mfa logs in exactly as before', async () => {
      mockPassportUser(user);

      const isEnrolled = jest.fn(() => Promise.resolve(false));
      const createChallenge = jest.fn();
      const { generateRefreshToken, generateAccessToken } = buildIssuingStrapi({
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
    });

    test('with the future flag off, an enrolled user logs in with the password alone', async () => {
      mockPassportUser(user);

      const isEnrolled = jest.fn(() => Promise.resolve(true));
      const createChallenge = jest.fn();
      const { generateRefreshToken } = buildIssuingStrapi({
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
    });

    test('with the future flag off, POST /login/mfa returns 404', async () => {
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

      const { ctx, notFound } = buildCtx({ challengeToken: 'challenge-token', code: '123456' });

      await authenticationController.loginMfa(ctx, jest.fn());

      expect(notFound).toHaveBeenCalled();
      expect(verifyChallenge).not.toHaveBeenCalled();
    });
  });
});
