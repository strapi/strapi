/* eslint-env jest */

import { errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import mfaController from '../mfa';
import { MfaRequiredError } from '../../services/mfa-errors';
import { MFA_TRUST_COOKIE_NAME } from '../../../../shared/utils/session-auth';

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
  stateOverrides: Record<string, unknown> = {},
  extra: { cookies?: Record<string, string>; params?: Record<string, string> } = {}
) => {
  const notFound = jest.fn();
  const internalServerError = jest.fn();
  const cookiesSet = jest.fn();
  const ctx = createContext(
    { body, params: extra.params ?? {} },
    {
      state: { user: { ...DEFAULT_USER, ...userOverrides }, ...stateOverrides },
      notFound,
      internalServerError,
      cookies: { get: jest.fn((name: string) => extra.cookies?.[name]), set: cookiesSet },
      request: { query: {}, body, headers: { 'user-agent': 'jest' }, secure: false },
    }
  ) as any;

  return { ctx, notFound, internalServerError, cookiesSet };
};

/**
 * A working strapi double for the paths that reach the session manager (disable): `listSessions`
 * defaults to empty (nothing to invalidate) and `invalidateRefreshToken` resolves, matching
 * `OriginSessionManagerService`'s real shape (`shared/utils/session-auth.ts`'s
 * `getSessionManager` reads `strapi.sessionManager`). `disable` revokes by device
 * (`invalidateRefreshToken(userId, deviceId)`), not by session row: a session row
 * disappearing from `listSessions` (because its refresh token rotated) does not mean the
 * device is gone, only that its *active* row changed shape, and only invalidating by device
 * reaches the rotated row too.
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
  const sessionManagerFn = jest.fn(() => ({
    invalidateRefreshToken,
    listSessions,
  }));
  // A default so every test reaching a successful `disable` doesn't have to supply its own --
  // only the one test asserting on the call needs to read it back off the return value.
  const notify = jest.fn();

  setStrapi({
    sessionManager: sessionManagerFn,
    log: { error: jest.fn(), warn: jest.fn() },
    admin: { services: { mfa: { notify, ...mfaOverrides } } },
  });

  return { invalidateRefreshToken, listSessions, sessionManagerFn, notify };
};

describe('mfa controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // No feature-off cases here: the gate is the `admin::isMfaEnabled` policy, which 404s before
  // any handler runs, so a handler-level test cannot observe it. That every route carries it is
  // pinned in `routes/__tests__/mfa.test.ts`, the policy's own behaviour in
  // `policies/__tests__/isMfaEnabled.test.ts`.

  test('GET /mfa/me never returns the secret', async () => {
    const isEnrolled = jest.fn(() => Promise.resolve(true));
    const countUnusedRecoveryCodes = jest.fn(() => Promise.resolve(3));
    const areCodesAcknowledged = jest.fn(() => Promise.resolve(true));
    const isMfaRequiredFor = jest.fn(() => Promise.resolve(false));

    setStrapi({
      admin: {
        services: {
          mfa: {
            isEnabled: jest.fn(() => true),
            isEnrolled,
            countUnusedRecoveryCodes,
            areCodesAcknowledged,
            isMfaRequiredFor,
            trustedDeviceSettings: jest.fn(() => Promise.resolve({ enabled: true, days: 30 })),
            passkeySettings: jest.fn(() => Promise.resolve({ enabled: true })),
            passkeysConfigured: jest.fn(() => true),
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
        required: false,
        graceUntil: null,
        trustedDevicesEnabled: true,
        passkeysEnabled: true,
        hasLocalPassword: false,
      },
    });
    expect(JSON.stringify(ctx.body)).not.toContain('top-secret-ciphertext');
  });

  describe('me (enforcement fields)', () => {
    test('reports required and the grace deadline for a required, unenrolled user', async () => {
      const isMfaRequiredFor = jest.fn(() => Promise.resolve(true));
      setStrapi({
        admin: {
          services: {
            mfa: {
              isEnabled: () => true,
              isEnrolled: jest.fn(() => Promise.resolve(false)),
              isMfaRequiredFor,
              trustedDeviceSettings: jest.fn(() => Promise.resolve({ enabled: true, days: 30 })),
              passkeySettings: jest.fn(() => Promise.resolve({ enabled: true })),
              passkeysConfigured: jest.fn(() => true),
            },
          },
        },
      });
      const graceUntil = new Date('2026-09-11T10:00:00.000Z');
      const { ctx } = buildCtx({}, { mfaGraceUntil: graceUntil });

      await mfaController.me(ctx);

      expect(isMfaRequiredFor).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
      expect(ctx.body).toEqual({
        data: {
          enabled: false,
          enabledAt: null,
          recoveryCodesRemaining: 0,
          codesAcknowledged: false,
          required: true,
          graceUntil: '2026-09-11T10:00:00.000Z',
          trustedDevicesEnabled: true,
          passkeysEnabled: true,
          hasLocalPassword: false,
        },
      });
    });

    test('reports required: false and graceUntil: null when nothing applies', async () => {
      setStrapi({
        admin: {
          services: {
            mfa: {
              isEnabled: () => true,
              isEnrolled: jest.fn(() => Promise.resolve(false)),
              isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
              trustedDeviceSettings: jest.fn(() => Promise.resolve({ enabled: true, days: 30 })),
              passkeySettings: jest.fn(() => Promise.resolve({ enabled: true })),
              passkeysConfigured: jest.fn(() => true),
            },
          },
        },
      });
      const { ctx } = buildCtx();

      await mfaController.me(ctx);

      expect(ctx.body.data).toEqual(expect.objectContaining({ required: false, graceUntil: null }));
    });

    test('reports trustedDevicesEnabled: false when the organisation does not offer trust', async () => {
      setStrapi({
        admin: {
          services: {
            mfa: {
              isEnabled: () => true,
              isEnrolled: jest.fn(() => Promise.resolve(false)),
              isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
              trustedDeviceSettings: jest.fn(() => Promise.resolve({ enabled: false, days: 30 })),
              passkeySettings: jest.fn(() => Promise.resolve({ enabled: true })),
              passkeysConfigured: jest.fn(() => true),
            },
          },
        },
      });
      const { ctx } = buildCtx();

      await mfaController.me(ctx);

      expect((ctx.body as any).data.trustedDevicesEnabled).toBe(false);
    });

    test('reports passkeysEnabled: false when the organisation has turned passkeys off', async () => {
      setStrapi({
        admin: {
          services: {
            mfa: {
              isEnabled: () => true,
              isEnrolled: jest.fn(() => Promise.resolve(false)),
              isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
              trustedDeviceSettings: jest.fn(() => Promise.resolve({ enabled: true, days: 30 })),
              passkeySettings: jest.fn(() => Promise.resolve({ enabled: false })),
            },
          },
        },
      });
      const { ctx } = buildCtx();

      await mfaController.me(ctx);

      expect(ctx.body.data.passkeysEnabled).toBe(false);
    });

    // `passkeysEnabled` is an AND, and this pins the half that is easy to drop: were it the org
    // policy alone, a deployment whose RP cannot resolve (the default production shape -- an
    // IP-literal `admin.absoluteUrl`) would advertise a passkey section that could never work.
    test('reports passkeysEnabled: false when the policy is on but the RP cannot be resolved', async () => {
      const passkeysConfigured = jest.fn(() => false);
      setStrapi({
        admin: {
          services: {
            mfa: {
              isEnabled: () => true,
              isEnrolled: jest.fn(() => Promise.resolve(false)),
              isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
              trustedDeviceSettings: jest.fn(() => Promise.resolve({ enabled: true, days: 30 })),
              passkeySettings: jest.fn(() => Promise.resolve({ enabled: true })),
              passkeysConfigured,
            },
          },
        },
      });
      const { ctx } = buildCtx();

      await mfaController.me(ctx);

      expect(passkeysConfigured).toHaveBeenCalled();
      expect(ctx.body.data.passkeysEnabled).toBe(false);
    });

    // `PasskeysCard` reads this to know whether the server's
    // password-less exemption in `updateSettings` could ever apply to the caller. `ctx.state.user`
    // is the raw `admin::user` row (see `strategies/admin.ts`), so a hashed password on the row
    // must be reported as `true`, and its absence (the SSO-only shape) as `false`.
    test('reports hasLocalPassword from the actor row, not just its presence in the default fixture', async () => {
      setStrapi({
        admin: {
          services: {
            mfa: {
              isEnabled: () => true,
              isEnrolled: jest.fn(() => Promise.resolve(false)),
              isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
              trustedDeviceSettings: jest.fn(() => Promise.resolve({ enabled: true, days: 30 })),
              passkeySettings: jest.fn(() => Promise.resolve({ enabled: true })),
              passkeysConfigured: jest.fn(() => true),
            },
          },
        },
      });

      const { ctx: withPassword } = buildCtx({}, { password: 'hashed' });
      await mfaController.me(withPassword);
      expect(withPassword.body.data.hasLocalPassword).toBe(true);

      const { ctx: withoutPassword } = buildCtx({}, { password: null });
      await mfaController.me(withoutPassword);
      expect(withoutPassword.body.data.hasLocalPassword).toBe(false);
    });
  });

  test('enrol requires the current password', async () => {
    const beginEnrolment = jest.fn();
    setStrapi({ admin: { services: { mfa: { isEnabled: jest.fn(() => true), beginEnrolment } } } });

    const { ctx } = buildCtx({});

    await expect(mfaController.enrol(ctx)).rejects.toMatchObject({ name: 'ValidationError' });
    expect(beginEnrolment).not.toHaveBeenCalled();
  });

  test('enrol/verify returns recovery codes exactly once, and notifies of the change', async () => {
    const completeEnrolment = jest.fn(() =>
      Promise.resolve({ recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'], replaced: false })
    );
    const recordEvent = jest.fn(() => Promise.resolve());
    const notify = jest.fn();

    setStrapi({
      admin: {
        services: {
          mfa: { isEnabled: jest.fn(() => true), completeEnrolment, recordEvent, notify },
        },
      },
    });

    const { ctx } = buildCtx({ code: '123456' });

    await mfaController.verifyEnrolment(ctx);

    expect(completeEnrolment).toHaveBeenCalledWith('7', '123456');
    expect(ctx.body).toEqual({
      data: { recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'], replaced: false },
    });
    expect(recordEvent).toHaveBeenCalledWith('7', 'enabled', expect.any(Object));
    // Notified after being recorded: `notify` is the eventHub/best-effort-email half,
    // `recordEvent` is the in-app notice feed -- both run, in that order.
    expect(notify).toHaveBeenCalledWith('7', 'enabled');
    expect(recordEvent.mock.invocationCallOrder[0]).toBeLessThan(
      notify.mock.invocationCallOrder[0]
    );
  });

  test('a second call to enrol/verify does not return codes again', async () => {
    // A real second call fails: the account is already enrolled and the TOTP step was already
    // consumed on the first call, so `completeEnrolment` rejects exactly as it does at the
    // service layer. The controller must not paper over that with a second set of codes.
    const completeEnrolment = jest
      .fn()
      .mockResolvedValueOnce({ recoveryCodes: ['AAAAA-BBBBB'], replaced: false })
      .mockRejectedValueOnce(new errors.ValidationError('Invalid code'));
    const recordEvent = jest.fn(() => Promise.resolve());
    const notify = jest.fn();

    setStrapi({
      admin: {
        services: {
          mfa: { isEnabled: jest.fn(() => true), completeEnrolment, recordEvent, notify },
        },
      },
    });

    const { ctx: firstCtx } = buildCtx({ code: '123456' });
    await mfaController.verifyEnrolment(firstCtx);
    expect(firstCtx.body).toEqual({ data: { recoveryCodes: ['AAAAA-BBBBB'], replaced: false } });

    const { ctx: secondCtx } = buildCtx({ code: '123456' });
    await expect(mfaController.verifyEnrolment(secondCtx)).rejects.toMatchObject({
      name: 'ValidationError',
    });
    expect(secondCtx.body).toBeUndefined();
    expect(recordEvent).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test('enrol forwards a trimmed code so an enrolled user can start a replacement', async () => {
    const beginEnrolment = jest.fn(() =>
      Promise.resolve({ secret: 's', otpauthUri: 'otpauth://x' })
    );
    setStrapi({ admin: { services: { mfa: { isEnabled: () => true, beginEnrolment } } } });
    const { ctx } = buildCtx({ password: 'pw', code: ' 123456 ' });

    await mfaController.enrol(ctx);

    expect(beginEnrolment).toHaveBeenCalledWith('7', 'pw', '123456');
  });

  test('verifyEnrolment records authenticator_replaced when the service reports a replacement', async () => {
    const recordEvent = jest.fn(() => Promise.resolve());
    const notify = jest.fn();
    const completeEnrolment = jest.fn(() =>
      Promise.resolve({ recoveryCodes: ['A'], replaced: true })
    );
    setStrapi({
      admin: {
        services: { mfa: { isEnabled: () => true, completeEnrolment, recordEvent, notify } },
      },
    });
    const { ctx } = buildCtx({ code: '123456' });

    await mfaController.verifyEnrolment(ctx);

    expect(recordEvent).toHaveBeenCalledWith('7', 'authenticator_replaced', expect.any(Object));
    expect(notify).toHaveBeenCalledWith('7', 'authenticator_replaced');
    expect(ctx.body).toEqual({ data: { recoveryCodes: ['A'], replaced: true } });
  });

  test('disable requires both the password and a valid code', async () => {
    const assertPasswordAndFactor = jest.fn(() =>
      Promise.reject(new errors.ValidationError('Invalid credentials'))
    );
    const disableFn = jest.fn();
    const recordEvent = jest.fn();
    const { invalidateRefreshToken, listSessions } = buildStrapiWithSessionManager({
      isEnabled: jest.fn(() => true),
      isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
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
            isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
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

  /** A `SessionEntry` fixture row, sharing the shape `listSessions` really returns. */
  const sessionRow = (sessionId: string, deviceId: string) => ({
    sessionId,
    userId: '7',
    deviceId,
    origin: 'admin',
    expiresAt: new Date(),
  });

  test("disable invalidates the user's other devices, but not the one making this request", async () => {
    const assertPasswordAndFactor = jest.fn(() => Promise.resolve());
    const disableFn = jest.fn(() => Promise.resolve());
    const recordEvent = jest.fn(() => Promise.resolve());
    const { invalidateRefreshToken, listSessions, sessionManagerFn, notify } =
      buildStrapiWithSessionManager({
        isEnabled: jest.fn(() => true),
        isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
        assertPasswordAndFactor,
        disable: disableFn,
        recordEvent,
      });
    listSessions.mockImplementation(() =>
      Promise.resolve([
        sessionRow('current-session', 'device-current'),
        sessionRow('other-session-1', 'device-1'),
        sessionRow('other-session-2', 'device-2'),
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
    expect(notify).toHaveBeenCalledWith('7', 'disabled');
    expect(sessionManagerFn).toHaveBeenCalledWith('admin');
    expect(listSessions).toHaveBeenCalledWith('7');
    // One call per other device -- not per session row, and each one carries a deviceId.
    expect(invalidateRefreshToken).toHaveBeenCalledTimes(2);
    expect(invalidateRefreshToken).toHaveBeenCalledWith('7', 'device-1');
    expect(invalidateRefreshToken).toHaveBeenCalledWith('7', 'device-2');
    // The property that matters: the device making this very request must survive, and eviction
    // is never done "for everyone" (a call with no deviceId) in this branch -- that would take
    // the caller's own device down too.
    expect(invalidateRefreshToken).not.toHaveBeenCalledWith('7', 'device-current');
    expect(invalidateRefreshToken).not.toHaveBeenCalledWith('7');
    expect(ctx.status).toBe(204);
  });

  test('two other sessions sharing one device are invalidated with a single call', async () => {
    const assertPasswordAndFactor = jest.fn(() => Promise.resolve());
    const disableFn = jest.fn(() => Promise.resolve());
    const recordEvent = jest.fn(() => Promise.resolve());
    const { invalidateRefreshToken, listSessions } = buildStrapiWithSessionManager({
      isEnabled: jest.fn(() => true),
      isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
      assertPasswordAndFactor,
      disable: disableFn,
      recordEvent,
    });
    listSessions.mockImplementation(() =>
      Promise.resolve([
        sessionRow('current-session', 'device-current'),
        // Two distinct session rows, the same device -- exactly the shape a rotated-then-active
        // pair would never produce (`listSessions` only ever returns the active one), but this
        // proves the de-duplication holds regardless of how two rows for one device arise.
        sessionRow('other-session-1', 'device-shared'),
        sessionRow('other-session-2', 'device-shared'),
      ])
    );

    const { ctx } = buildCtx(
      { password: 'Password123', code: '123456' },
      {},
      { session: { id: 'current-session' } }
    );

    await mfaController.disable(ctx);

    expect(invalidateRefreshToken).toHaveBeenCalledTimes(1);
    expect(invalidateRefreshToken).toHaveBeenCalledWith('7', 'device-shared');
    expect(ctx.status).toBe(204);
  });

  test('disable falls back to evicting every device when the current session cannot be identified', async () => {
    const assertPasswordAndFactor = jest.fn(() => Promise.resolve());
    const disableFn = jest.fn(() => Promise.resolve());
    const recordEvent = jest.fn(() => Promise.resolve());
    const { invalidateRefreshToken, listSessions } = buildStrapiWithSessionManager({
      isEnabled: jest.fn(() => true),
      isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
      assertPasswordAndFactor,
      disable: disableFn,
      recordEvent,
    });

    // No `session` on `ctx.state` -- fails closed rather than guessing which device is current.
    const { ctx } = buildCtx({ password: 'Password123', code: '123456' });

    await mfaController.disable(ctx);

    expect(listSessions).not.toHaveBeenCalled();
    expect(invalidateRefreshToken).toHaveBeenCalledWith('7');
    expect(ctx.status).toBe(204);
  });

  test('disable falls back to evicting every device when the caller session is not in the list', async () => {
    const assertPasswordAndFactor = jest.fn(() => Promise.resolve());
    const disableFn = jest.fn(() => Promise.resolve());
    const recordEvent = jest.fn(() => Promise.resolve());
    const { invalidateRefreshToken, listSessions } = buildStrapiWithSessionManager({
      isEnabled: jest.fn(() => true),
      isMfaRequiredFor: jest.fn(() => Promise.resolve(false)),
      assertPasswordAndFactor,
      disable: disableFn,
      recordEvent,
    });
    listSessions.mockImplementation(() =>
      Promise.resolve([sessionRow('some-other-session', 'device-1')])
    );

    // `ctx.state.session.id` names a session that `listSessions` no longer returns -- e.g. it was
    // revoked between the access-token check and this call. Fails closed rather than guessing.
    const { ctx } = buildCtx(
      { password: 'Password123', code: '123456' },
      {},
      { session: { id: 'stale-session' } }
    );

    await mfaController.disable(ctx);

    expect(listSessions).toHaveBeenCalledWith('7');
    expect(invalidateRefreshToken).toHaveBeenCalledWith('7');
    expect(ctx.status).toBe(204);
  });

  test('disable is refused with MfaRequiredError while the caller is required, before any attempt is spent', async () => {
    const assertPasswordAndFactor = jest.fn();
    // `buildStrapiWithSessionManager` calls `setStrapi` itself -- see its definition above.
    buildStrapiWithSessionManager({
      isEnabled: () => true,
      isMfaRequiredFor: jest.fn(() => Promise.resolve(true)),
      assertPasswordAndFactor,
    });
    const { ctx } = buildCtx({ password: 'pw', code: '123456' });

    await expect(mfaController.disable(ctx)).rejects.toBeInstanceOf(MfaRequiredError);
    expect(assertPasswordAndFactor).not.toHaveBeenCalled();
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

  describe('unlockUser', () => {
    const build = (unlockResult: boolean, userExists = true) => {
      const unlock = jest.fn(() => Promise.resolve(unlockResult));
      const findOne = jest.fn(() => Promise.resolve(userExists ? { id: 3 } : null));
      setStrapi({
        admin: { services: { mfa: { isEnabled: () => true, unlock }, user: { findOne } } },
      });
      const notFound = jest.fn();
      const badRequest = jest.fn();
      const ctx = createContext(
        {},
        {
          state: { user: { id: 7 } },
          params: { id: '3' },
          notFound,
          badRequest,
          request: { query: {}, body: {} },
        }
      ) as any;
      return { ctx, unlock, notFound, badRequest };
    };

    test('unlocks and answers 204 with the acting admin recorded', async () => {
      const { ctx, unlock } = build(true);
      await mfaController.unlockUser(ctx);
      expect(unlock).toHaveBeenCalledWith('3', { byUserId: '7' });
      expect(ctx.status).toBe(204);
    });

    test('400 when the user is not locked', async () => {
      const { ctx, badRequest } = build(false);
      await mfaController.unlockUser(ctx);
      expect(badRequest).toHaveBeenCalledWith('This account is not locked');
      expect(ctx.status).not.toBe(204);
    });

    test('404 when the user does not exist', async () => {
      const { ctx, unlock, notFound } = build(false, false);
      await mfaController.unlockUser(ctx);
      expect(notFound).toHaveBeenCalledWith('User does not exist');
      expect(unlock).not.toHaveBeenCalled();
      expect(ctx.status).not.toBe(204);
    });
  });

  describe('resetUser', () => {
    const build = (userExists = true) => {
      const resetUser = jest.fn(() => Promise.resolve());
      const findOne = jest.fn(() => Promise.resolve(userExists ? { id: 3 } : null));
      setStrapi({
        admin: { services: { mfa: { isEnabled: () => true, resetUser }, user: { findOne } } },
      });
      const notFound = jest.fn();
      const ctx = createContext(
        {},
        {
          state: { user: { id: 7 } },
          params: { id: '3' },
          notFound,
          request: { query: {}, body: {} },
        }
      ) as any;
      return { ctx, resetUser, notFound };
    };

    test('resets and answers 204 with the acting admin recorded', async () => {
      const { ctx, resetUser } = build();
      await mfaController.resetUser(ctx);
      expect(resetUser).toHaveBeenCalledWith('3', { byUserId: '7' });
      expect(ctx.status).toBe(204);
    });

    // Deliberately not a 400, unlike `unlockUser`: the caller's intent is "this account must end
    // up with no second factor", and one that already has none satisfies it.
    test('204 for an account that was never enrolled', async () => {
      const { ctx, resetUser } = build();
      await mfaController.resetUser(ctx);
      expect(resetUser).toHaveBeenCalled();
      expect(ctx.status).toBe(204);
    });

    test('404 when the user does not exist, without touching the factor', async () => {
      const { ctx, resetUser, notFound } = build(false);
      await mfaController.resetUser(ctx);
      expect(notFound).toHaveBeenCalledWith('User does not exist');
      expect(resetUser).not.toHaveBeenCalled();
      expect(ctx.status).not.toBe(204);
    });
  });

  describe('trusted devices', () => {
    const enabledMfa = (overrides: Record<string, unknown> = {}) => ({
      isEnabled: jest.fn(() => true),
      ...overrides,
    });
    const device = {
      id: '3',
      deviceName: 'Chrome on macOS',
      createdAt: '2026-09-01T00:00:00.000Z',
      expiresAt: '2026-10-01T00:00:00.000Z',
      lastUsedAt: null,
      current: true,
    };

    test('listTrustedDevices passes the presented cookie so the current row can be marked', async () => {
      const listTrustedDevices = jest.fn(() => Promise.resolve([device]));
      setStrapi({ admin: { services: { mfa: enabledMfa({ listTrustedDevices }) } } });
      const { ctx } = buildCtx({}, {}, {}, { cookies: { [MFA_TRUST_COOKIE_NAME]: 'trust-token' } });

      await mfaController.listTrustedDevices(ctx);

      expect(listTrustedDevices).toHaveBeenCalledWith('7', 'trust-token');
      expect(ctx.body).toEqual({ data: [device] });
    });

    test('revokeTrustedDevice: a non-numeric id is a 404 without touching the service', async () => {
      const revokeTrustedDevice = jest.fn();
      setStrapi({ admin: { services: { mfa: enabledMfa({ revokeTrustedDevice }) } } });
      const { ctx, notFound } = buildCtx({}, {}, {}, { params: { id: '3; drop' } });

      await mfaController.revokeTrustedDevice(ctx);

      expect(notFound).toHaveBeenCalled();
      expect(revokeTrustedDevice).not.toHaveBeenCalled();
    });

    test("revokeTrustedDevice: a row that is not the caller's is a 404 and no cookie changes", async () => {
      const revokeTrustedDevice = jest.fn(() =>
        Promise.resolve({ revoked: false, current: false })
      );
      setStrapi({ admin: { services: { mfa: enabledMfa({ revokeTrustedDevice }) } } });
      const { ctx, notFound, cookiesSet } = buildCtx({}, {}, {}, { params: { id: '3' } });

      await mfaController.revokeTrustedDevice(ctx);

      expect(revokeTrustedDevice).toHaveBeenCalledWith('7', '3', undefined);
      expect(notFound).toHaveBeenCalled();
      expect(cookiesSet).not.toHaveBeenCalled();
    });

    test('revokeTrustedDevice: the current row clears the cookie, another row does not', async () => {
      const revokeTrustedDevice = jest
        .fn()
        .mockResolvedValueOnce({ revoked: true, current: true })
        .mockResolvedValueOnce({ revoked: true, current: false });
      // `revokeTrustedDevice` clears the trust cookie via `clearTrustCookie`, which reads cookie
      // scope options off `strapi.config` (see `session-issuing-paths.test.ts` for the same
      // double) -- unlike the other trusted-device tests, this is the one where the current row
      // actually triggers that path.
      setStrapi({
        config: { get: jest.fn(() => undefined) },
        admin: { services: { mfa: enabledMfa({ revokeTrustedDevice }) } },
      });

      const current = buildCtx(
        {},
        {},
        {},
        { params: { id: '3' }, cookies: { [MFA_TRUST_COOKIE_NAME]: 'trust-token' } }
      );
      await mfaController.revokeTrustedDevice(current.ctx);
      expect(revokeTrustedDevice).toHaveBeenCalledWith('7', '3', 'trust-token');
      expect(current.ctx.status).toBe(204);
      expect(current.cookiesSet).toHaveBeenCalledWith(
        MFA_TRUST_COOKIE_NAME,
        '',
        expect.objectContaining({ expires: new Date(0) })
      );

      const other = buildCtx(
        {},
        {},
        {},
        { params: { id: '4' }, cookies: { [MFA_TRUST_COOKIE_NAME]: 'trust-token' } }
      );
      await mfaController.revokeTrustedDevice(other.ctx);
      expect(other.ctx.status).toBe(204);
      expect(other.cookiesSet).not.toHaveBeenCalled();
    });

    test('revokeAllTrustedDevices always clears the cookie', async () => {
      const revokeAllTrustedDevices = jest.fn(() => Promise.resolve(2));
      // Same `config` double as above: this handler always calls `clearTrustCookie`.
      setStrapi({
        config: { get: jest.fn(() => undefined) },
        admin: { services: { mfa: enabledMfa({ revokeAllTrustedDevices }) } },
      });
      const { ctx, cookiesSet } = buildCtx();

      await mfaController.revokeAllTrustedDevices(ctx);

      expect(revokeAllTrustedDevices).toHaveBeenCalledWith('7');
      expect(ctx.status).toBe(204);
      expect(cookiesSet).toHaveBeenCalledWith(
        MFA_TRUST_COOKIE_NAME,
        '',
        expect.objectContaining({ expires: new Date(0) })
      );
    });

    test('listUserTrustedDevices: 404 for an unknown user; current is stripped for a known one', async () => {
      const listTrustedDevices = jest.fn(() => Promise.resolve([device]));
      const findOne = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 42 });
      setStrapi({
        admin: { services: { mfa: enabledMfa({ listTrustedDevices }), user: { findOne } } },
      });

      const unknown = buildCtx({}, {}, {}, { params: { id: '42' } });
      await mfaController.listUserTrustedDevices(unknown.ctx);
      expect(unknown.notFound).toHaveBeenCalled();
      expect(listTrustedDevices).not.toHaveBeenCalled();

      const known = buildCtx(
        {},
        {},
        {},
        { params: { id: '42' }, cookies: { [MFA_TRUST_COOKIE_NAME]: 'trust-token' } }
      );
      await mfaController.listUserTrustedDevices(known.ctx);
      expect(listTrustedDevices).toHaveBeenCalledWith('42');
      expect(known.ctx.body).toEqual({
        data: [
          {
            id: '3',
            deviceName: 'Chrome on macOS',
            createdAt: '2026-09-01T00:00:00.000Z',
            expiresAt: '2026-10-01T00:00:00.000Z',
            lastUsedAt: null,
          },
        ],
      });
    });

    test('revokeUserTrustedDevices: 404 for an unknown user; names the acting administrator otherwise', async () => {
      const revokeAllTrustedDevices = jest.fn(() => Promise.resolve(1));
      const findOne = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 42 });
      setStrapi({
        admin: { services: { mfa: enabledMfa({ revokeAllTrustedDevices }), user: { findOne } } },
      });

      const unknown = buildCtx({}, {}, {}, { params: { id: '42' } });
      await mfaController.revokeUserTrustedDevices(unknown.ctx);
      expect(unknown.notFound).toHaveBeenCalled();
      expect(revokeAllTrustedDevices).not.toHaveBeenCalled();

      const known = buildCtx({}, {}, {}, { params: { id: '42' } });
      await mfaController.revokeUserTrustedDevices(known.ctx);
      expect(revokeAllTrustedDevices).toHaveBeenCalledWith('42', { byUserId: '7' });
      expect(known.ctx.status).toBe(204);
    });
  });

  describe('passkeys', () => {
    const buildStrapiWithPasskeys = (overrides: Record<string, unknown> = {}) => {
      const passkeySettings = jest.fn(() => Promise.resolve({ enabled: true }));
      const isEnrolled = jest.fn(() => Promise.resolve(true));
      const assertPasswordAndFactor = jest.fn(() => Promise.resolve());
      const passkeyRegistrationOptions = jest.fn(() =>
        Promise.resolve({
          challenge: 'opts-challenge',
          rp: { id: 'cms.example.com', name: 'Strapi' },
        })
      );
      const registerPasskey = jest.fn(() =>
        Promise.resolve({ id: '4', name: 'Work laptop', createdAt: 'now', lastUsedAt: null })
      );
      const listPasskeys = jest.fn(() => Promise.resolve([]));
      const countPasskeys = jest.fn(() => Promise.resolve(2));
      const deletePasskey = jest.fn(() => Promise.resolve(true));
      const clearPasskeys = jest.fn(() => Promise.resolve(2));
      const recordEvent = jest.fn(() => Promise.resolve());
      const notify = jest.fn(() => Promise.resolve());
      const findOne = jest.fn((id: string) =>
        Promise.resolve(id === '404' ? null : { id: Number(id) })
      );

      const mfa = {
        isEnabled: () => true,
        passkeySettings,
        isEnrolled,
        assertPasswordAndFactor,
        passkeyRegistrationOptions,
        registerPasskey,
        listPasskeys,
        countPasskeys,
        deletePasskey,
        clearPasskeys,
        recordEvent,
        notify,
        ...overrides,
      };

      setStrapi({ admin: { services: { mfa, user: { findOne } } } });

      // Read back off `mfa` itself, not the local consts above: an override in `overrides`
      // replaces the property on `mfa` (what the controller actually calls) without touching the
      // shadowed local binding, so a caller asserting on the returned handle for an overridden
      // key must see the same function the controller reached through `getService('mfa')`.
      return {
        passkeySettings: mfa.passkeySettings,
        isEnrolled: mfa.isEnrolled,
        assertPasswordAndFactor: mfa.assertPasswordAndFactor,
        passkeyRegistrationOptions: mfa.passkeyRegistrationOptions,
        registerPasskey: mfa.registerPasskey,
        listPasskeys: mfa.listPasskeys,
        countPasskeys: mfa.countPasskeys,
        deletePasskey: mfa.deletePasskey,
        clearPasskeys: mfa.clearPasskeys,
        recordEvent: mfa.recordEvent,
        notify: mfa.notify,
        findOne,
      };
    };

    test('options refuses with "Passkeys are disabled" before the body is even validated', async () => {
      const doubles = buildStrapiWithPasskeys({
        passkeySettings: jest.fn(() => Promise.resolve({ enabled: false })),
      });
      // An empty body would fail validation too; the policy message is what must come back, and
      // no attempt may be spent on a request that can never succeed.
      const { ctx } = buildCtx({});

      await expect(mfaController.passkeyRegistrationOptions(ctx)).rejects.toThrow(
        'Passkeys are disabled'
      );
      expect(doubles.assertPasswordAndFactor).not.toHaveBeenCalled();
      expect(doubles.passkeyRegistrationOptions).not.toHaveBeenCalled();
    });

    test("options refuses an unenrolled caller: a passkey is never a user's only factor", async () => {
      const doubles = buildStrapiWithPasskeys({
        isEnrolled: jest.fn(() => Promise.resolve(false)),
      });
      const { ctx } = buildCtx({ password: 'pw', code: '123456' });

      await expect(mfaController.passkeyRegistrationOptions(ctx)).rejects.toThrow(
        'Set up an authenticator app before adding a passkey.'
      );
      expect(doubles.assertPasswordAndFactor).not.toHaveBeenCalled();
    });

    test('options costs a password and a live factor, then returns the options object', async () => {
      const doubles = buildStrapiWithPasskeys();
      const { ctx } = buildCtx({ password: 'pw', code: ' 123456 ' });

      await mfaController.passkeyRegistrationOptions(ctx);

      expect(doubles.assertPasswordAndFactor).toHaveBeenCalledWith('7', 'pw', '123456');
      expect(ctx.body.data).toMatchObject({ challenge: 'opts-challenge' });
    });

    // The single most important property of this handler -- a password alone must never
    // authorise a brand-new second factor. The gate is `validatePasskeyOptionsInput` requiring
    // `code` plus `assertPasswordAndFactor` verifying it; both halves are pinned so neither can be
    // silently loosened (e.g. `code` becoming optional in the schema) without a red test here.
    test('a password alone does not authorise a new factor', async () => {
      const doubles = buildStrapiWithPasskeys();
      const { ctx } = buildCtx({ password: 'pw' }); // no code

      await expect(mfaController.passkeyRegistrationOptions(ctx)).rejects.toMatchObject({
        name: 'ValidationError',
      });
      expect(doubles.assertPasswordAndFactor).not.toHaveBeenCalled();
      expect(doubles.passkeyRegistrationOptions).not.toHaveBeenCalled();
    });

    test('a wrong code refuses even with the right password, and issues no ceremony', async () => {
      const doubles = buildStrapiWithPasskeys({
        assertPasswordAndFactor: jest.fn(() =>
          Promise.reject(new errors.ValidationError('Invalid code'))
        ),
      });
      const { ctx } = buildCtx({ password: 'pw', code: '000000' });

      await expect(mfaController.passkeyRegistrationOptions(ctx)).rejects.toThrow('Invalid code');
      expect(doubles.passkeyRegistrationOptions).not.toHaveBeenCalled();
      expect(ctx.body).toBeUndefined();
    });

    test('register trims the name and returns only the four public fields', async () => {
      const doubles = buildStrapiWithPasskeys();
      const registration = { id: 'cred-1', response: {} };
      const { ctx } = buildCtx({ name: '  Work laptop  ', registration });

      await mfaController.registerPasskey(ctx);

      expect(doubles.registerPasskey).toHaveBeenCalledWith('7', 'Work laptop', registration);
      expect(ctx.body).toEqual({
        data: { id: '4', name: 'Work laptop', createdAt: 'now', lastUsedAt: null },
      });
    });

    test.each([[''], ['   '], ['x'.repeat(51)]])('register rejects the name %p', async (name) => {
      // A bare `rejects.toThrow()` would pass on any rejection at all, including one caused by a
      // missing mock, so the doubles are kept and asserted: the refusal must happen *before* the
      // service is reached.
      const doubles = buildStrapiWithPasskeys();
      const { ctx } = buildCtx({ name, registration: { id: 'cred-1' } });

      await expect(mfaController.registerPasskey(ctx)).rejects.toMatchObject({
        name: 'ValidationError',
      });
      expect(doubles.registerPasskey).not.toHaveBeenCalled();
    });

    test("the list is the caller's own", async () => {
      const doubles = buildStrapiWithPasskeys();
      const { ctx } = buildCtx();

      await mfaController.listPasskeys(ctx);

      expect(doubles.listPasskeys).toHaveBeenCalledWith('7');
      expect(ctx.body).toEqual({ data: [] });
    });

    test('delete: a non-numeric id is a 404 without touching the service', async () => {
      const doubles = buildStrapiWithPasskeys();
      const { ctx, notFound } = buildCtx({}, {}, {}, { params: { id: 'abc' } });

      await mfaController.deletePasskey(ctx);

      expect(notFound).toHaveBeenCalled();
      expect(doubles.deletePasskey).not.toHaveBeenCalled();
    });

    test("delete: a row that is not the caller's is a 404; their own is a 204 with no body", async () => {
      const missing = buildStrapiWithPasskeys({
        deletePasskey: jest.fn(() => Promise.resolve(false)),
      });
      const first = buildCtx({}, {}, {}, { params: { id: '9' } });
      await mfaController.deletePasskey(first.ctx);
      expect(first.notFound).toHaveBeenCalled();
      expect(missing.deletePasskey).toHaveBeenCalledWith('7', '9');

      // An empty body proves nothing about ownership -- a body (or param) that tries to
      // supply its own owner must be ignored, and the handler must use only the session's user.
      const spoofed = buildStrapiWithPasskeys({
        deletePasskey: jest.fn(() => Promise.resolve(false)),
      });
      const injected = buildCtx({ userId: '8' }, {}, {}, { params: { id: '9', userId: '8' } });
      await mfaController.deletePasskey(injected.ctx);
      expect(injected.notFound).toHaveBeenCalled();
      expect(spoofed.deletePasskey).toHaveBeenCalledWith('7', '9');

      buildStrapiWithPasskeys();
      const second = buildCtx({}, {}, {}, { params: { id: '9' } });
      await mfaController.deletePasskey(second.ctx);
      expect(second.ctx.status).toBe(204);
      expect(second.ctx.body).toBeUndefined();
    });

    test('the administrator count: 404 for an unknown user, a bare number for a known one', async () => {
      const doubles = buildStrapiWithPasskeys();

      const unknown = buildCtx({}, {}, {}, { params: { id: '404' } });
      await mfaController.listUserPasskeys(unknown.ctx);
      expect(unknown.notFound).toHaveBeenCalled();
      expect(doubles.countPasskeys).not.toHaveBeenCalled();

      const known = buildCtx({}, {}, {}, { params: { id: '12' } });
      await mfaController.listUserPasskeys(known.ctx);
      // A number, not an inventory of somebody's hardware.
      expect(known.ctx.body).toEqual({ data: { count: 2 } });
    });

    test('the administrator delete names the acting administrator and how many it covered', async () => {
      const doubles = buildStrapiWithPasskeys();
      const { ctx } = buildCtx({}, {}, {}, { params: { id: '12' } });

      await mfaController.deleteUserPasskeys(ctx);

      expect(doubles.clearPasskeys).toHaveBeenCalledWith('12');
      expect(doubles.recordEvent).toHaveBeenCalledWith('12', 'passkey_removed', {
        byUserId: '7',
        count: 2,
      });
      expect(doubles.notify).toHaveBeenCalledWith('12', 'passkey_removed', {
        byUserId: '7',
        count: 2,
      });
      expect(ctx.status).toBe(204);
      expect(ctx.body).toBeUndefined();
    });

    test('the administrator delete on an empty list leaves no notice behind', async () => {
      const doubles = buildStrapiWithPasskeys({ clearPasskeys: jest.fn(() => Promise.resolve(0)) });
      const { ctx } = buildCtx({}, {}, {}, { params: { id: '12' } });

      await mfaController.deleteUserPasskeys(ctx);

      expect(doubles.recordEvent).not.toHaveBeenCalled();
      expect(doubles.notify).not.toHaveBeenCalled();
      expect(ctx.status).toBe(204);
    });

    test('the administrator delete is a 404 for an unknown user, and deletes nothing', async () => {
      const doubles = buildStrapiWithPasskeys();
      const { ctx, notFound } = buildCtx({}, {}, {}, { params: { id: '404' } });

      await mfaController.deleteUserPasskeys(ctx);

      expect(notFound).toHaveBeenCalled();
      expect(doubles.clearPasskeys).not.toHaveBeenCalled();
    });
  });
});
