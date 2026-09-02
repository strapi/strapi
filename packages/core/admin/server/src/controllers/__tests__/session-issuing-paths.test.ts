/* eslint-env jest */

import fs from 'node:fs';
import path from 'node:path';

// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import authenticationController from '../authentication';
import { REFRESH_COOKIE_NAME } from '../../../../shared/utils/session-auth';
// The real implementation, not a canned mock: used wherever a test needs to prove that
// `sanitizeUser` actually strips a field (e.g. the MFA columns) from an `admin.auth.*` event
// payload. A mock that always returns the same fixed object would make that kind of assertion
// vacuous -- it would pass even if the controller emitted the raw user. Mirrors
// `authentication.test.ts`.
import userService from '../../services/user';

const { sanitizeUser: realSanitizeUser } = userService;

const setStrapi = (value: object) => {
  (globalThis as any).strapi = value;
};

/**
 * Every path that mints an admin session must have had an explicit MFA decision. If this test
 * fails because a new call site appeared, do not update the list without deciding what that
 * path does when the user has a second factor enrolled.
 */
const DECIDED_CALL_SITES = [
  'login', // gated: issues a challenge instead
  'loginMfa', // the gate itself
  'register', // no gate: invite acceptance, the user cannot be enrolled yet
  'registerAdmin', // no gate: first admin bootstrap, no mfa can exist
  'resetPassword', // gated: issues a challenge instead
];

const defaultResetBody = { resetPasswordToken: 'reset-token', password: 'NewPassword123' };

/**
 * `resetPassword` reads `request.body` twice for two different reasons: `ctx.request.body` is
 * cast to the validated input, and (on the ungated path) `issueSession` -> `extractDeviceParams`
 * reads it again for `deviceId`/`rememberMe`. Mirrors `buildCtx` in `authentication.test.ts`.
 */
const buildResetCtx = (cookiesSet: jest.Mock, body: Record<string, unknown> = defaultResetBody) => {
  const ctx = createContext(
    { body },
    {
      state: {},
      cookies: { set: cookiesSet },
      internalServerError: jest.fn(),
      request: { query: {}, body, headers: {}, secure: false },
    }
  ) as any;

  return ctx;
};

/**
 * A working `resetPassword` double: an mfa service reporting `enrolled`, a session manager that
 * can both invalidate and (on the ungated path) mint a session, plus `eventHub`/`log`/`config`
 * for `issueSession`'s cookie-building path. `sanitizeUser` is always the real implementation
 * (not a canned mock) so any test can assert on what actually reaches an emitted payload or
 * `ctx.body`. Mirrors `buildIssuingStrapi` in `authentication.test.ts`, scoped to what
 * `resetPassword` reads.
 */
const buildResetStrapi = ({
  enrolled,
  resetPassword,
}: {
  enrolled: boolean;
  resetPassword: jest.Mock;
}) => {
  const invalidateRefreshToken = jest.fn(() => Promise.resolve());
  const isEnrolled = jest.fn(() => Promise.resolve(enrolled));
  const createChallenge = jest.fn(() =>
    Promise.resolve({ token: 'reset-challenge-token', expiresIn: 300 })
  );
  const generateRefreshToken = jest.fn(() =>
    Promise.resolve({ token: 'refresh-token', absoluteExpiresAt: undefined })
  );
  const generateAccessToken = jest.fn(() => Promise.resolve({ token: 'access-token' }));
  const sanitizeUser = jest.fn(realSanitizeUser);
  const emit = jest.fn();

  setStrapi({
    eventHub: { emit },
    log: { error: jest.fn(), warn: jest.fn() },
    config: { get: jest.fn(() => undefined) },
    sessionManager: jest.fn(() => ({
      invalidateRefreshToken,
      generateRefreshToken,
      generateAccessToken,
    })),
    admin: {
      services: {
        auth: { resetPassword },
        mfa: { isEnabled: jest.fn(() => true), isEnrolled, createChallenge },
        user: { sanitizeUser },
      },
    },
  });

  return {
    invalidateRefreshToken,
    isEnrolled,
    createChallenge,
    generateRefreshToken,
    generateAccessToken,
    sanitizeUser,
    emit,
  };
};

describe('session issuing paths', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('no undecided call site mints an admin session', () => {
    const controller = fs.readFileSync(path.join(__dirname, '..', 'authentication.ts'), 'utf8');

    // `issueSession` is imported from shared/utils/session-auth.ts, not defined here, so every
    // match is an actual call site -- one per decided path, no separate "definition" match to
    // account for.
    const callSites = [...controller.matchAll(/issueSession\(/g)];

    expect(callSites.length).toBe(DECIDED_CALL_SITES.length);

    expect(controller).not.toMatch(/generateRefreshToken\(/);

    // `issueSession` isn't the only way to mint tokens: `accessToken` (the refresh-token
    // exchange) calls the session manager's rotate/generate primitives directly, bypassing
    // `issueSession` entirely because it isn't authenticating a user, just renewing an existing
    // session. `accessToken` is the one decided call site for each -- a second call site would
    // be a new way to mint a token outside both `issueSession` and this decision.
    const rotateSites = [...controller.matchAll(/rotateRefreshToken\(/g)];
    const generateAccessTokenSites = [...controller.matchAll(/generateAccessToken\(/g)];

    expect(rotateSites.length).toBe(1);
    expect(generateAccessTokenSites.length).toBe(1);
  });

  test('an enrolled user resetting their password gets a challenge, not a session', async () => {
    const user = {
      id: 9,
      email: 'reset-mfa@example.com',
      isActive: true,
      // Carried on the fixture so the real `sanitizeUser` (see `buildResetStrapi`) has
      // something non-vacuous to strip -- present here (and only here) matters because this
      // test asserts on the exact emitted payload.
      mfaSecret: 'encrypted-secret-ciphertext',
      mfaEnabledAt: '2026-01-01T00:00:00.000Z',
      mfaLastUsedStep: 3,
    };

    const resetPassword = jest.fn(() => Promise.resolve(user));
    const {
      invalidateRefreshToken,
      isEnrolled,
      createChallenge,
      generateRefreshToken,
      generateAccessToken,
      emit,
    } = buildResetStrapi({ enrolled: true, resetPassword });

    const cookiesSet = jest.fn();
    const ctx = buildResetCtx(cookiesSet);

    await authenticationController.resetPassword(ctx);

    expect(invalidateRefreshToken).toHaveBeenCalledWith(String(user.id));
    expect(isEnrolled).toHaveBeenCalledWith(String(user.id));
    expect(createChallenge).toHaveBeenCalledWith(String(user.id));

    // The property this task exists for: no cookie, no token, alongside mfaRequired.
    expect(cookiesSet).not.toHaveBeenCalled();
    expect(generateRefreshToken).not.toHaveBeenCalled();
    expect(generateAccessToken).not.toHaveBeenCalled();
    expect(ctx.body).toEqual({
      data: { mfaRequired: true, challengeToken: 'reset-challenge-token', expiresIn: 300 },
    });

    // Same audit visibility as the login gate, and for the same reason: a gated reset must not
    // look like a completed one. The exact-shape match below only means something because
    // `sanitizeUser` is the real implementation (see `buildResetStrapi`) -- a mock returning a
    // fixed object would pass whether or not the controller ever sanitized anything.
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

  test('a user with no mfa resetting their password still gets a session', async () => {
    const user = { id: 11, email: 'reset-no-mfa@example.com', isActive: true };

    const resetPassword = jest.fn(() => Promise.resolve(user));
    const {
      invalidateRefreshToken,
      isEnrolled,
      createChallenge,
      generateRefreshToken,
      generateAccessToken,
      emit,
    } = buildResetStrapi({ enrolled: false, resetPassword });

    const cookiesSet = jest.fn();
    const ctx = buildResetCtx(cookiesSet);

    await authenticationController.resetPassword(ctx);

    expect(invalidateRefreshToken).toHaveBeenCalledWith(String(user.id));
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
      data: {
        token: 'access-token',
        accessToken: 'access-token',
        user: { id: user.id, email: user.email, isActive: user.isActive },
      },
    });

    expect(emit).not.toHaveBeenCalledWith('admin.auth.mfa_required', expect.anything());
    // The ungated reset path does not emit `admin.auth.success` today -- out of scope for this
    // task, and this pins the current behaviour so a future change to it is a deliberate one.
    expect(emit).not.toHaveBeenCalledWith('admin.auth.success', expect.anything());
  });

  test('existing sessions are still invalidated before the new one, enrolled or not', async () => {
    const runReset = async (enrolled: boolean) => {
      const user = { id: enrolled ? 21 : 22, email: 'x@example.com', isActive: true };
      const resetPassword = jest.fn(() => Promise.resolve(user));
      const { invalidateRefreshToken, createChallenge, generateRefreshToken } = buildResetStrapi({
        enrolled,
        resetPassword,
      });

      const ctx = buildResetCtx(jest.fn());
      await authenticationController.resetPassword(ctx);

      return { invalidateRefreshToken, createChallenge, generateRefreshToken };
    };

    const enrolledResult = await runReset(true);
    expect(enrolledResult.invalidateRefreshToken).toHaveBeenCalled();
    expect(enrolledResult.createChallenge).toHaveBeenCalled();
    expect(enrolledResult.invalidateRefreshToken.mock.invocationCallOrder[0]).toBeLessThan(
      enrolledResult.createChallenge.mock.invocationCallOrder[0]
    );

    const unenrolledResult = await runReset(false);
    expect(unenrolledResult.invalidateRefreshToken).toHaveBeenCalled();
    expect(unenrolledResult.generateRefreshToken).toHaveBeenCalled();
    expect(unenrolledResult.invalidateRefreshToken.mock.invocationCallOrder[0]).toBeLessThan(
      unenrolledResult.generateRefreshToken.mock.invocationCallOrder[0]
    );
  });

  test('a user may never hold both a registration token and an active enrolment', async () => {
    // Guards the `register()` reasoning: `registrationToken` can only be non-null on a user who
    // has never logged in (and therefore can't be mfa-enrolled) because exactly one place mints
    // a real one (user creation) and exactly one place clears it on acceptance (`register`). If
    // a future change lets an admin re-issue a registration token to an already-active,
    // possibly-enrolled user, `/admin/register` becomes an mfa-skipping account takeover.

    const SERVER_SRC = path.join(__dirname, '..', '..');

    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return walk(entryPath);
        }
        return entryPath.endsWith('.ts') ? [entryPath] : [];
      });

    // Content-type and validation-schema files declare *shape* (a field exists, or a payload
    // may carry it) rather than performing a runtime write, so they're excluded on purpose.
    // Everything else that assigns `registrationToken:` as an object-literal value is either a
    // real database write or an API response echoing one that already happened.
    const files = walk(SERVER_SRC).filter(
      (file) =>
        !file.includes(`${path.sep}__tests__${path.sep}`) &&
        !file.includes(`${path.sep}content-types${path.sep}`) &&
        !file.includes(`${path.sep}validation${path.sep}`)
    );

    const writeSites = files.flatMap((file) => {
      const contents = fs.readFileSync(file, 'utf8');
      // Excludes `registrationToken: string` type annotations (two of them, on
      // `findRegistrationInfo` and `register`'s destructured parameter in services/user.ts) --
      // those describe a parameter's shape, not an assignment.
      const count = [...contents.matchAll(/registrationToken:(?!\s*string)/g)].length;
      return Array(count).fill(path.relative(SERVER_SRC, file));
    });

    // controllers/user.ts echoes the token `create` already minted into the invite-creation
    // response. services/user.ts is the only place that ever assigns it: once to mint a real
    // token (createUserInDatabase), once to null it for the bootstrap admin (createFirstAdmin,
    // who never had one to accept), and once to null it on registration acceptance (register --
    // the write this test exists to protect).
    expect(writeSites.sort()).toEqual(
      ['controllers/user.ts', 'services/user.ts', 'services/user.ts', 'services/user.ts'].sort()
    );

    // Behavioural half: call the real, unmocked `register` and prove it is the site that nulls
    // the token, rather than trusting that the literal text is merely present somewhere.
    const updateById = jest.fn(() => Promise.resolve({}));
    const findOne = jest.fn(() => Promise.resolve({ id: 42, registrationToken: 'a-real-token' }));

    setStrapi({
      db: { query: jest.fn(() => ({ findOne })) },
      admin: { services: { user: { updateById } } },
    });

    await userService.register({
      registrationToken: 'a-real-token',
      userInfo: { password: 'NewPassword123', firstname: 'A', lastname: 'B' },
    });

    expect(updateById).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ registrationToken: null, isActive: true })
    );
  });
});
