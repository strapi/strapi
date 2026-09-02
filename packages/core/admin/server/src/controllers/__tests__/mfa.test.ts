/* eslint-env jest */

import { errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import mfaController from '../mfa';

const setStrapi = (value: object) => {
  (globalThis as any).strapi = value;
};

const DEFAULT_USER = { id: 7, mfaEnabledAt: null, mfaSecret: null, mfaLastUsedStep: null };

/**
 * Mirrors `buildCtx` in `authentication.test.ts` / `session-issuing-paths.test.ts`: a real
 * `admin::user` row (carrying the private MFA columns, see `strategies/admin.ts`) is placed on
 * `ctx.state.user` the way the admin auth strategy actually does it, so `me`'s read of
 * `ctx.state.user.mfaEnabledAt` is exercised against a non-vacuous fixture.
 */
const buildCtx = (
  body: Record<string, unknown> = {},
  userOverrides: Record<string, unknown> = {},
  stateOverrides: Record<string, unknown> = {}
) => {
  const notFound = jest.fn();
  const internalServerError = jest.fn();
  const ctx = createContext(
    { body },
    {
      state: { user: { ...DEFAULT_USER, ...userOverrides }, ...stateOverrides },
      notFound,
      internalServerError,
      request: { query: {}, body, headers: { 'user-agent': 'jest' }, secure: false },
    }
  ) as any;

  return { ctx, notFound, internalServerError };
};

/**
 * A working strapi double for the paths that reach the session manager (disable): `listSessions`
 * defaults to empty (nothing to revoke) and `invalidateRefreshToken`/`revokeSessionById` resolve,
 * matching `OriginSessionManagerService`'s real shape (`shared/utils/session-auth.ts`'s
 * `getSessionManager` reads `strapi.sessionManager`).
 */
interface FakeSessionEntry {
  sessionId: string;
  userId: string;
  deviceId: string;
  origin: string;
  expiresAt: Date;
}

const buildStrapiWithSessionManager = (mfaOverrides: Record<string, unknown>) => {
  const invalidateRefreshToken = jest.fn(() => Promise.resolve());
  const listSessions = jest.fn((): Promise<FakeSessionEntry[]> => Promise.resolve([]));
  const revokeSessionById = jest.fn(() => Promise.resolve(true));
  const sessionManagerFn = jest.fn(() => ({
    invalidateRefreshToken,
    listSessions,
    revokeSessionById,
  }));

  setStrapi({
    sessionManager: sessionManagerFn,
    log: { error: jest.fn(), warn: jest.fn() },
    admin: { services: { mfa: mfaOverrides } },
  });

  return { invalidateRefreshToken, listSessions, revokeSessionById, sessionManagerFn };
};

describe('mfa controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('every route 404s when the future flag is off', async () => {
    const routes: Array<[keyof typeof mfaController, Record<string, unknown>]> = [
      ['me', {}],
      ['enrol', { password: 'Password123' }],
      ['verifyEnrolment', { code: '123456' }],
      ['regenerateRecoveryCodes', { password: 'Password123', code: '123456' }],
      ['acknowledgeRecoveryCodes', {}],
      ['disable', { password: 'Password123', code: '123456' }],
      ['notices', {}],
      ['markNoticesSeen', {}],
    ];

    for (const [handlerName, body] of routes) {
      // A double with only `isEnabled`: if a handler ever reached past `requireEnabled` it would
      // call an undefined method and reject, which would fail this test just as loudly as a
      // missing `notFound()` call would.
      setStrapi({ admin: { services: { mfa: { isEnabled: jest.fn(() => false) } } } });
      const { ctx, notFound } = buildCtx(body);

      // eslint-disable-next-line no-await-in-loop
      await (mfaController[handlerName] as (ctx: unknown) => Promise<void>)(ctx);

      expect(notFound).toHaveBeenCalled();
      expect(ctx.body).toBeUndefined();
    }
  });

  test('GET /mfa/me never returns the secret', async () => {
    const isEnrolled = jest.fn(() => Promise.resolve(true));
    const countUnusedRecoveryCodes = jest.fn(() => Promise.resolve(3));
    const areCodesAcknowledged = jest.fn(() => Promise.resolve(true));

    setStrapi({
      admin: {
        services: {
          mfa: {
            isEnabled: jest.fn(() => true),
            isEnrolled,
            countUnusedRecoveryCodes,
            areCodesAcknowledged,
          },
        },
      },
    });

    const enabledAt = '2026-01-01T00:00:00.000Z';
    const { ctx } = buildCtx(
      {},
      { mfaEnabledAt: enabledAt, mfaSecret: 'enc:top-secret-ciphertext', mfaLastUsedStep: 5 }
    );

    await mfaController.me(ctx);

    // An exact match, not a subset match: a mutant that leaks `secret`/`mfaSecret` onto the body
    // alongside these fields would fail `toEqual` even though it would still pass a
    // `toMatchObject` check on the same four keys.
    expect(ctx.body).toEqual({
      data: {
        enabled: true,
        enabledAt,
        recoveryCodesRemaining: 3,
        codesAcknowledged: true,
      },
    });
    expect(JSON.stringify(ctx.body)).not.toContain('top-secret-ciphertext');
  });

  test('enrol requires the current password', async () => {
    const beginEnrolment = jest.fn();
    setStrapi({ admin: { services: { mfa: { isEnabled: jest.fn(() => true), beginEnrolment } } } });

    const { ctx } = buildCtx({});

    await expect(mfaController.enrol(ctx)).rejects.toMatchObject({ name: 'ValidationError' });
    expect(beginEnrolment).not.toHaveBeenCalled();
  });

  test('enrol/verify returns recovery codes exactly once', async () => {
    const completeEnrolment = jest.fn(() =>
      Promise.resolve({ recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] })
    );
    const recordEvent = jest.fn(() => Promise.resolve());

    setStrapi({
      admin: {
        services: { mfa: { isEnabled: jest.fn(() => true), completeEnrolment, recordEvent } },
      },
    });

    const { ctx } = buildCtx({ code: '123456' });

    await mfaController.verifyEnrolment(ctx);

    expect(completeEnrolment).toHaveBeenCalledWith('7', '123456');
    expect(ctx.body).toEqual({ data: { recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] } });
    // Recorded, never notified -- `mfa.notify` does not exist until Task 11, so a controller that
    // called it here would reject with a "not a function" error and fail this test.
    expect(recordEvent).toHaveBeenCalledWith('7', 'enabled', expect.any(Object));
  });

  test('a second call to enrol/verify does not return codes again', async () => {
    // A real second call fails: the account is already enrolled and the TOTP step was already
    // consumed on the first call, so `completeEnrolment` rejects exactly as it does at the
    // service layer (Task 5). The controller must not paper over that with a second set of codes.
    const completeEnrolment = jest
      .fn()
      .mockResolvedValueOnce({ recoveryCodes: ['AAAAA-BBBBB'] })
      .mockRejectedValueOnce(new errors.ValidationError('Invalid code'));
    const recordEvent = jest.fn(() => Promise.resolve());

    setStrapi({
      admin: {
        services: { mfa: { isEnabled: jest.fn(() => true), completeEnrolment, recordEvent } },
      },
    });

    const { ctx: firstCtx } = buildCtx({ code: '123456' });
    await mfaController.verifyEnrolment(firstCtx);
    expect(firstCtx.body).toEqual({ data: { recoveryCodes: ['AAAAA-BBBBB'] } });

    const { ctx: secondCtx } = buildCtx({ code: '123456' });
    await expect(mfaController.verifyEnrolment(secondCtx)).rejects.toMatchObject({
      name: 'ValidationError',
    });
    expect(secondCtx.body).toBeUndefined();
    expect(recordEvent).toHaveBeenCalledTimes(1);
  });

  test('disable requires both the password and a valid code', async () => {
    const assertPasswordAndFactor = jest.fn(() =>
      Promise.reject(new errors.ValidationError('Invalid credentials'))
    );
    const disableFn = jest.fn();
    const recordEvent = jest.fn();
    const { invalidateRefreshToken, listSessions, revokeSessionById } =
      buildStrapiWithSessionManager({
        isEnabled: jest.fn(() => true),
        assertPasswordAndFactor,
        disable: disableFn,
        recordEvent,
      });

    // Missing code entirely -- rejected by the validator before the service is even reached.
    const { ctx: missingCodeCtx } = buildCtx({ password: 'Password123' });
    await expect(mfaController.disable(missingCodeCtx)).rejects.toMatchObject({
      name: 'ValidationError',
    });
    expect(assertPasswordAndFactor).not.toHaveBeenCalled();

    // Missing password entirely -- same.
    const { ctx: missingPasswordCtx } = buildCtx({ code: '123456' });
    await expect(mfaController.disable(missingPasswordCtx)).rejects.toMatchObject({
      name: 'ValidationError',
    });
    expect(assertPasswordAndFactor).not.toHaveBeenCalled();

    // Both present, but the shared re-auth gate rejects: nothing past it may run.
    const { ctx } = buildCtx({ password: 'wrong', code: '123456' });
    await expect(mfaController.disable(ctx)).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Invalid credentials',
    });
    expect(disableFn).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
    expect(invalidateRefreshToken).not.toHaveBeenCalled();
    expect(listSessions).not.toHaveBeenCalled();
    expect(revokeSessionById).not.toHaveBeenCalled();
  });

  test('disable returns 500 and touches nothing when the session manager is unavailable', async () => {
    // Checked before `assertPasswordAndFactor` runs: a broken deployment must not be allowed to
    // spend the caller's password/code attempt, or actually disable two-factor authentication,
    // only to then discover it cannot evict sessions.
    const assertPasswordAndFactor = jest.fn();
    const disableFn = jest.fn();
    const recordEvent = jest.fn();

    setStrapi({
      log: { error: jest.fn() },
      admin: {
        services: {
          mfa: {
            isEnabled: jest.fn(() => true),
            assertPasswordAndFactor,
            disable: disableFn,
            recordEvent,
          },
        },
      },
      // No `sessionManager` at all.
    });

    const { ctx, internalServerError } = buildCtx({ password: 'Password123', code: '123456' });

    await mfaController.disable(ctx);

    expect(internalServerError).toHaveBeenCalled();
    expect(assertPasswordAndFactor).not.toHaveBeenCalled();
    expect(disableFn).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
    expect(ctx.status).not.toBe(204);
  });

  test('disable invalidates the user other sessions, but not the one making this request', async () => {
    const assertPasswordAndFactor = jest.fn(() => Promise.resolve());
    const disableFn = jest.fn(() => Promise.resolve());
    const recordEvent = jest.fn(() => Promise.resolve());
    const { listSessions, revokeSessionById, sessionManagerFn } = buildStrapiWithSessionManager({
      isEnabled: jest.fn(() => true),
      assertPasswordAndFactor,
      disable: disableFn,
      recordEvent,
    });
    const activeSession = (sessionId: string) => ({
      sessionId,
      userId: '7',
      deviceId: sessionId,
      origin: 'admin',
      expiresAt: new Date(),
    });
    listSessions.mockImplementation(() =>
      Promise.resolve([
        activeSession('current-session'),
        activeSession('other-session-1'),
        activeSession('other-session-2'),
      ])
    );

    // `ctx.state.session` mirrors what the admin auth strategy sets from the access token
    // backing this very request (`strategies/admin.ts`).
    const { ctx } = buildCtx(
      { password: 'Password123', code: '123456' },
      {},
      { session: { id: 'current-session' } }
    );

    await mfaController.disable(ctx);

    expect(assertPasswordAndFactor).toHaveBeenCalledWith('7', 'Password123', '123456');
    expect(disableFn).toHaveBeenCalledWith('7');
    expect(recordEvent).toHaveBeenCalledWith('7', 'disabled', expect.any(Object));
    expect(sessionManagerFn).toHaveBeenCalledWith('admin');
    expect(listSessions).toHaveBeenCalledWith('7');
    expect(revokeSessionById).toHaveBeenCalledWith('7', 'other-session-1');
    expect(revokeSessionById).toHaveBeenCalledWith('7', 'other-session-2');
    // The property this fix exists for: the session this very request is authenticated with must
    // survive, or a successful disable would silently log the acting admin out.
    expect(revokeSessionById).not.toHaveBeenCalledWith('7', 'current-session');
    expect(ctx.status).toBe(204);
  });

  test('disable falls back to evicting every session when the current one cannot be identified', async () => {
    const assertPasswordAndFactor = jest.fn(() => Promise.resolve());
    const disableFn = jest.fn(() => Promise.resolve());
    const recordEvent = jest.fn(() => Promise.resolve());
    const { invalidateRefreshToken, listSessions } = buildStrapiWithSessionManager({
      isEnabled: jest.fn(() => true),
      assertPasswordAndFactor,
      disable: disableFn,
      recordEvent,
    });

    // No `session` on `ctx.state` -- fails closed rather than guessing which session is current.
    const { ctx } = buildCtx({ password: 'Password123', code: '123456' });

    await mfaController.disable(ctx);

    expect(invalidateRefreshToken).toHaveBeenCalledWith('7');
    expect(listSessions).not.toHaveBeenCalled();
    expect(ctx.status).toBe(204);
  });

  test('regenerating codes requires both the password and a valid code', async () => {
    const assertPasswordAndFactor = jest.fn(() =>
      Promise.reject(new errors.ValidationError('Invalid code'))
    );
    const issueRecoveryCodes = jest.fn();

    setStrapi({
      admin: {
        services: {
          mfa: { isEnabled: jest.fn(() => true), assertPasswordAndFactor, issueRecoveryCodes },
        },
      },
    });

    // Missing code entirely -- rejected before the service is reached.
    const { ctx: missingCodeCtx } = buildCtx({ password: 'Password123' });
    await expect(mfaController.regenerateRecoveryCodes(missingCodeCtx)).rejects.toMatchObject({
      name: 'ValidationError',
    });
    expect(assertPasswordAndFactor).not.toHaveBeenCalled();

    // Both present, but the shared gate rejects the code -- no new codes are issued.
    const { ctx } = buildCtx({ password: 'Password123', code: '000000' });
    await expect(mfaController.regenerateRecoveryCodes(ctx)).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Invalid code',
    });
    expect(issueRecoveryCodes).not.toHaveBeenCalled();
  });

  test('notices/seen only marks the calling user rows', async () => {
    const markEventsSeen = jest.fn(() => Promise.resolve());
    setStrapi({
      admin: { services: { mfa: { isEnabled: jest.fn(() => true), markEventsSeen } } },
    });

    const { ctx } = buildCtx({ ids: [101, 202] }, { id: 7 });

    await mfaController.markNoticesSeen(ctx);

    // Scoped by the id the auth strategy put on `ctx.state.user`, never by anything the request
    // body could carry.
    expect(markEventsSeen).toHaveBeenCalledWith('7', [101, 202]);
    expect(ctx.status).toBe(204);

    // A body that tries to smuggle a different owner in is rejected outright: `.noUnknown()` on
    // the validator has no `userId` field to accept, so this never reaches the service at all --
    // the actual cross-user isolation (a foreign id inside `ids` is left untouched) is proven at
    // the service layer in `services/__tests__/mfa.test.ts`, against real rows.
    markEventsSeen.mockClear();
    const { ctx: injectionAttemptCtx } = buildCtx({ ids: [101], userId: 'someone-else' });
    await expect(mfaController.markNoticesSeen(injectionAttemptCtx)).rejects.toMatchObject({
      name: 'ValidationError',
    });
    expect(markEventsSeen).not.toHaveBeenCalled();
  });
});
