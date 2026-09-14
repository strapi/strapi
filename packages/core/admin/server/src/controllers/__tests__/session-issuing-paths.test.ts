/* eslint-env jest */

import fs from 'node:fs';
import path from 'node:path';

// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import authenticationController from '../authentication';
import { REFRESH_COOKIE_NAME } from '../../../../shared/utils/session-auth';
import { MfaLockedError } from '../../services/mfa-errors';
// The real implementation, for the reason `authentication.test.ts` gives: a canned mock would
// make every "this field never leaks" assertion vacuous.
import userService from '../../services/user';

const { sanitizeUser: realSanitizeUser } = userService;

const setStrapi = (value: object) => {
  (globalThis as any).strapi = value;
};

/** If this fails because a new call site appeared, decide what that path does for an enrolled
 * user before updating the list. */
const DECIDED_CALL_SITES = [
  'login', // gated: issues a challenge instead
  'loginMfa', // the gate itself
  'loginMfaWebauthn', // the same gate, satisfied by a passkey instead of a code
  'register', // no gate: invite acceptance, the user cannot be enrolled yet
  'registerAdmin', // no gate: first admin bootstrap, no mfa can exist
  'resetPassword', // gated: issues a challenge instead
];

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(entryPath);
    }
    return entryPath.endsWith('.ts') ? [entryPath] : [];
  });

/** The three roots a session can be minted from. `admin/src` is out of scope: nothing in the React
 * app can mint a server-side session. */
const ADMIN_ROOT = path.join(__dirname, '..', '..', '..', '..');
const SERVER_SRC = path.join(ADMIN_ROOT, 'server', 'src');
const EE_SERVER_SRC = path.join(ADMIN_ROOT, 'ee', 'server', 'src');
const SHARED_DIR = path.join(ADMIN_ROOT, 'shared');

const defaultResetBody = { resetPasswordToken: 'reset-token', password: 'NewPassword123' };

/** `resetPassword` reads `request.body` twice: once as the validated input, and again through
 * `extractDeviceParams`. */
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

/** `buildIssuingStrapi` from `authentication.test.ts`, scoped to what `resetPassword` reads, with
 * the real `sanitizeUser`. */
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
        mfa: {
          isEnabled: jest.fn(() => true),
          isEnrolled,
          createChallenge,
          enforce: jest.fn(() => Promise.resolve({ outcome: 'none' })),
          trustedDeviceSettings: jest.fn(() => Promise.resolve({ enabled: true, days: 30 })),
          countPasskeys: jest.fn(() => Promise.resolve(1)),
          passkeysConfigured: jest.fn(() => true),
        },
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

type SessionPath = 'register' | 'registerAdmin' | 'resetPassword';

/** Real, valid bodies: the validators actually run. */
const validRegisterBody = {
  registrationToken: 'a-real-token',
  userInfo: { firstname: 'Kai', lastname: 'Doe', password: 'NewPassword123' },
};
const validRegisterAdminBody = {
  email: 'first-admin@example.com',
  firstname: 'Kai',
  lastname: 'Doe',
  password: 'NewPassword123',
};

/**
 * A working double for whichever of `register` / `registerAdmin` / `resetPassword` the caller
 * names, scoped to what each reads: `user.register` / `user.createFirstAdmin` /
 * `auth.resetPassword` all resolve the same fixture user, `telemetry.send` covers
 * `registerAdmin`'s bootstrap event, and `invalidateRefreshToken` covers `resetPassword`'s
 * pre-existing invalidate-all-sessions step. `mfa.isEnabled`/`isEnrolled` default to a state that
 * never reaches the (unrelated) challenge branch on `resetPassword` -- consistent with a graced
 * or refused user necessarily being unenrolled -- so every test using this builder is free to
 * focus purely on `enforce`.
 */
const buildPath = (
  path: SessionPath,
  mfaOverrides: Record<string, unknown> = {}
): { ctx: any; generateRefreshToken: jest.Mock } => {
  const user = { id: 31, email: 'session-path-user@example.com', isActive: true };

  const generateRefreshToken = jest.fn(() =>
    Promise.resolve({ token: 'refresh-token', absoluteExpiresAt: undefined })
  );
  const generateAccessToken = jest.fn(() => Promise.resolve({ token: 'access-token' }));
  const invalidateRefreshToken = jest.fn(() => Promise.resolve());
  const sanitizeUser = jest.fn(realSanitizeUser);

  setStrapi({
    eventHub: { emit: jest.fn() },
    log: { error: jest.fn(), warn: jest.fn() },
    config: { get: jest.fn(() => undefined) },
    telemetry: { send: jest.fn() },
    sessionManager: jest.fn(() => ({
      generateRefreshToken,
      generateAccessToken,
      invalidateRefreshToken,
    })),
    admin: {
      services: {
        user: {
          sanitizeUser,
          register: jest.fn(() => Promise.resolve(user)),
          createFirstAdmin: jest.fn(() => Promise.resolve(user)),
        },
        auth: {
          resetPassword: jest.fn(() => Promise.resolve(user)),
        },
        mfa: {
          isEnabled: jest.fn(() => true),
          isEnrolled: jest.fn(() => Promise.resolve(false)),
          createChallenge: jest.fn(() =>
            Promise.resolve({ token: 'path-challenge-token', expiresIn: 300 })
          ),
          enforce: jest.fn(() => Promise.resolve({ outcome: 'none' })),
          countPasskeys: jest.fn(() => Promise.resolve(0)),
          ...mfaOverrides,
        },
      },
    },
  });

  const bodyByPath: Record<SessionPath, Record<string, unknown>> = {
    register: validRegisterBody,
    registerAdmin: validRegisterAdminBody,
    resetPassword: defaultResetBody,
  };
  const body = bodyByPath[path];

  const ctx = createContext(
    { body },
    {
      state: {},
      cookies: { set: jest.fn() },
      internalServerError: jest.fn(),
      request: { query: {}, body, headers: {}, secure: false },
    }
  ) as any;

  return { ctx, generateRefreshToken };
};

const invokePath = (path: SessionPath, ctx: any) => authenticationController[path](ctx);

describe('session issuing paths', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('no undecided call site mints an admin session', () => {
    const controller = fs.readFileSync(path.join(__dirname, '..', 'authentication.ts'), 'utf8');

    // Imported, not defined here, so every match is a call site.
    const callSites = [...controller.matchAll(/issueSession\(/g)];

    expect(callSites.length).toBe(DECIDED_CALL_SITES.length);

    // `login` still funnels both its branches (challenge, session) through one call site: the
    // trusted-device and passkey paths fall through to it rather than adding a second.
    const loginBlock = controller.slice(
      controller.indexOf('login: compose('),
      controller.indexOf('loginMfa: compose(')
    );
    expect([...loginBlock.matchAll(/issueSession\(/g)]).toHaveLength(1);

    expect(controller).not.toMatch(/generateRefreshToken\(/);

    // `accessToken` bypasses `issueSession` because it renews rather than authenticates. A second
    // call site would be a new way to mint a token outside both it and this decision.
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
      // Carried on the fixture so `sanitizeUser` has something to strip: this test asserts on
      // the exact emitted payload.
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

    // The property the challenge step rests on: no cookie, no token, alongside mfaRequired.
    expect(cookiesSet).not.toHaveBeenCalled();
    expect(generateRefreshToken).not.toHaveBeenCalled();
    expect(generateAccessToken).not.toHaveBeenCalled();
    expect(ctx.body).toEqual({
      data: {
        mfaRequired: true,
        challengeToken: 'reset-challenge-token',
        expiresIn: 300,
        trustedDeviceDays: 30,
        passkeyAvailable: true,
      },
    });

    // A gated reset must not look like a completed one. The exact-shape match means something only
    // because `sanitizeUser` is the real implementation.
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
    // Pins today's behaviour, so a change to it is a deliberate one.
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
    // `registrationToken` can only be non-null on a user who has never logged in, and so cannot be
    // enrolled, because one place mints it and one clears it. If a future change lets an admin
    // re-issue one to an active user, `/admin/register` becomes an MFA-skipping account takeover.

    // Content-type and validation files declare shape rather than write, so they are excluded.
    const files = walk(SERVER_SRC).filter(
      (file) =>
        !file.includes(`${path.sep}__tests__${path.sep}`) &&
        !file.includes(`${path.sep}content-types${path.sep}`) &&
        !file.includes(`${path.sep}validation${path.sep}`)
    );

    const writeSites = files.flatMap((file) => {
      const contents = fs.readFileSync(file, 'utf8');
      // Excludes `registrationToken: string` type annotations, which describe a parameter's
      // shape rather than an assignment.
      const count = [...contents.matchAll(/registrationToken:(?!\s*string)/g)].length;
      return Array(count).fill(path.relative(SERVER_SRC, file));
    });

    // `services/user.ts` is the only place that assigns it: mint, null it for the bootstrap admin,
    // and null it on registration acceptance -- the write this test exists to protect.
    expect(writeSites.sort()).toEqual(
      ['controllers/user.ts', 'services/user.ts', 'services/user.ts', 'services/user.ts'].sort()
    );

    // The behavioural half: the real `register` must be the site that nulls the token.
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

  describe('enforcement runs before every session is minted', () => {
    const graceUntil = new Date('2026-09-11T10:00:00.000Z');

    test.each(['register', 'registerAdmin', 'resetPassword'] as const)(
      '%s: a refused user gets no session and a graced user gets the deadline',
      async (path) => {
        // Refused
        {
          const enforce = jest.fn(() => Promise.resolve({ outcome: 'refused' }));
          const { ctx, generateRefreshToken } = buildPath(path, { enforce });
          await expect(invokePath(path, ctx)).rejects.toBeInstanceOf(MfaLockedError);
          expect(generateRefreshToken).not.toHaveBeenCalled();
        }
        // Graced
        {
          const enforce = jest.fn(() => Promise.resolve({ outcome: 'grace', graceUntil }));
          const { ctx, generateRefreshToken } = buildPath(path, { enforce });
          await invokePath(path, ctx);
          expect(enforce.mock.invocationCallOrder[0]).toBeLessThan(
            generateRefreshToken.mock.invocationCallOrder[0]
          );
          expect(ctx.body.data).toEqual(
            expect.objectContaining({
              mfaEnrolmentRequired: true,
              mfaGraceUntil: graceUntil.toISOString(),
            })
          );
        }
      }
    );
  });
});

/**
 * The enumeration above reads `controllers/authentication.ts` only, so it cannot see a mint site
 * elsewhere -- including the EE SSO callback, which calls `generateRefreshToken` directly because
 * passport has already authenticated and there is no body for `extractDeviceParams` to read.
 * This scans the whole surface for both ways a session is minted and pins the decided set. A new
 * call site must fail here until it is added with its own decision.
 */
describe('generateRefreshToken / issueSession call-site inventory', () => {
  const PATTERNS = ['issueSession(', 'generateRefreshToken('] as const;

  test('generateRefreshToken( and issueSession( occur only at the exact, decided sites', () => {
    const roots = [SERVER_SRC, EE_SERVER_SRC, SHARED_DIR];

    const found: Record<string, number> = {};

    for (const root of roots) {
      const files = walk(root).filter((file) => !file.includes(`${path.sep}__tests__${path.sep}`));

      for (const file of files) {
        const contents = fs.readFileSync(file, 'utf8');
        const relative = path.relative(ADMIN_ROOT, file);

        for (const pattern of PATTERNS) {
          const count = [...contents.matchAll(new RegExp(pattern.replace('(', '\\('), 'g'))].length;
          if (count > 0) {
            found[`${relative} :: ${pattern}`] = count;
          }
        }
      }
    }

    expect(found).toEqual({
      // The six decided CE call sites (`login`, `loginMfa`, `loginMfaWebauthn`, `register`,
      // `registerAdmin`, `resetPassword`) -- already enumerated and reasoned about individually
      // above.
      [`${path.join('server', 'src', 'controllers', 'authentication.ts')} :: issueSession(`]:
        DECIDED_CALL_SITES.length,
      // `issueSession`'s own implementation: every CE flow above funnels through this one call.
      [`${path.join('shared', 'utils', 'session-auth.ts')} :: generateRefreshToken(`]: 1,
      // The SSO callback: deliberately exempt from `issueSession` (see the block comment above).
      [`${path.join('ee', 'server', 'src', 'controllers', 'authentication-utils', 'middlewares.ts')} :: generateRefreshToken(`]: 1,
    });
  });
});

/**
 * API token and transfer token requests must succeed for an mfa-enrolled user presenting no
 * code at all -- those strategies authenticate a *token*, not an interactive admin session, and
 * there is nothing resembling a second factor to check. That is exactly the kind of property a
 * later refactor breaks silently: someone "helpfully" adding an mfa check to a shared auth
 * strategy file would lock out every API/transfer-token integration for any org whose
 * service-account owner happens to be mfa-enrolled, and nothing in an interactive/browser-driven
 * test suite would ever exercise a token-authenticated request from an enrolled account to catch
 * it. Asserted structurally rather than behaviourally: no strategy file may mention `mfa` in any
 * form at all.
 */
describe('programmatic-auth strategies stay mfa-free', () => {
  test('no file under server/src/strategies references mfa in any form', () => {
    const STRATEGIES_DIR = path.join(SERVER_SRC, 'strategies');
    const files = walk(STRATEGIES_DIR).filter(
      (file) => !file.includes(`${path.sep}__tests__${path.sep}`)
    );

    // Sanity check on the scan itself: an empty file list would make the assertion below
    // vacuously pass.
    expect(files.length).toBeGreaterThan(0);

    const offenders = files
      .filter((file) => /mfa/i.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SERVER_SRC, file));

    expect(offenders).toEqual([]);
  });
});
