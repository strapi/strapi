'use strict';

/* eslint-env jest */

/**
 * Unit tests for the auth controller.
 *
 * Regression coverage for:
 *   "refresh token cookies missing Max-Age attribute when sessions.cookie.maxAge is configured"
 *
 * Verifies that `maxAge` from `sessions.cookie.maxAge` is forwarded to
 * `ctx.cookies.set()` in callback (local + OAuth) and refresh actions.
 */

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any require() calls
// ---------------------------------------------------------------------------

// Stub @strapi/utils so we don't need the package to be built at test time.
jest.mock('@strapi/utils', () => ({
  errors: {
    ApplicationError: class ApplicationError extends Error {
      constructor(msg) {
        super(msg);
        this.name = 'ApplicationError';
      }
    },
    ValidationError: class ValidationError extends Error {
      constructor(msg) {
        super(msg);
        this.name = 'ValidationError';
      }
    },
    ForbiddenError: class ForbiddenError extends Error {
      constructor(msg) {
        super(msg);
        this.name = 'ForbiddenError';
      }
    },
  },
}));

// Stub getService so user.validatePassword always resolves true (no bcrypt needed)
// and jwt.issue returns a dummy token.
// Path is relative to the controller file being required (server/controllers/),
// so from __tests__ perspective, ../utils maps to server/utils.
jest.mock('../../utils', () => ({
  getService(name) {
    if (name === 'user') {
      return { validatePassword: jest.fn().mockResolvedValue(true) };
    }
    if (name === 'jwt') {
      return { issue: jest.fn().mockReturnValue('legacy-jwt-token') };
    }
    if (name === 'providers') {
      return {
        connect: jest.fn().mockResolvedValue({
          id: 2,
          username: 'oauthuser',
          email: 'oauth@example.com',
          provider: 'github',
          confirmed: true,
          blocked: false,
        }),
      };
    }
    return {};
  },
}));

// Stub validation functions — we only care about cookie options, not input validation.
jest.mock('../validation/auth', () => ({
  validateCallbackBody: jest.fn().mockResolvedValue(undefined),
  validateRegisterBody: jest.fn().mockResolvedValue(undefined),
  validateSendEmailConfirmationBody: jest.fn().mockResolvedValue(undefined),
  validateForgotPasswordBody: jest.fn().mockResolvedValue(undefined),
  validateResetPasswordBody: jest.fn().mockResolvedValue(undefined),
  validateEmailConfirmationBody: jest.fn().mockResolvedValue(undefined),
  validateChangePasswordBody: jest.fn().mockResolvedValue(undefined),
}));

// Stub crypto to avoid any OS-level issues in CI
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn().mockReturnValue('mock-uuid-1234'),
  randomBytes: jest.fn().mockReturnValue({ toString: () => 'mock-reset-token' }),
}));

const {
  createMockSessionManager,
} = require('../../../../../../tests/helpers/create-session-manager-mock');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a sessions config object with the given maxAge value.
 * Sets httpOnly: true so that the cookie-setting branch is always exercised.
 */
const makeUpSessions = (maxAge) => ({
  httpOnly: true,
  cookie: {
    name: 'refresh_token',
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge,
  },
});

/**
 * Builds a minimal mock `strapi` object for the auth controller.
 * Accepts a pre-built sessionManager callable (from createMockSessionManager).
 */
const defaultGrantSettings = {
  email: { enabled: true },
  local: { enabled: true },
  github: { enabled: true },
};

const buildStrapi = ({
  upSessions,
  sessionManagerCallable,
  grantSettings = defaultGrantSettings,
}) => ({
  config: {
    get: jest.fn((key, defaultVal) => {
      if (key === 'plugin::users-permissions.jwtManagement') return 'refresh';
      if (key === 'plugin::users-permissions.sessions') return upSessions;
      return defaultVal;
    }),
  },
  sessionManager: sessionManagerCallable,
  store: jest.fn().mockReturnValue({
    get: jest.fn(({ key }) => {
      if (key === 'grant') {
        return Promise.resolve(grantSettings);
      }
      if (key === 'advanced') {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    }),
  }),
  db: {
    query: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        provider: 'local',
        confirmed: true,
        blocked: false,
      }),
    }),
  },
  getModel: jest.fn().mockReturnValue({}),
  contentAPI: {
    sanitize: {
      output: jest.fn((user) => Promise.resolve(user)),
    },
  },
  log: { error: jest.fn() },
});

/**
 * Builds a minimal Koa-like context.
 * `cookies.set` is a jest spy so we can assert the options passed to it.
 */
const buildCtx = ({
  body = {},
  headers = {},
  cookieValue = null,
  params = { provider: 'local' },
  query = {},
} = {}) => {
  const cookiesSet = jest.fn();
  return {
    params,
    request: { body, header: headers },
    query,
    state: { auth: {} },
    cookies: {
      set: cookiesSet,
      get: jest.fn().mockReturnValue(cookieValue),
    },
    send: jest.fn(),
    badRequest: jest.fn(),
    unauthorized: jest.fn(),
    notFound: jest.fn(),
    _cookiesSet: cookiesSet,
  };
};

/** Returns the options object (3rd arg) from the first cookies.set() call. */
const getCookieOptions = (ctx) => {
  expect(ctx._cookiesSet).toHaveBeenCalled();
  return ctx._cookiesSet.mock.calls[0][2];
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth controller — refresh token cookie options', () => {
  let sessionManagerCallable;

  beforeEach(() => {
    ({ sessionManager: sessionManagerCallable } = createMockSessionManager({
      generateRefreshToken: jest.fn().mockResolvedValue({ token: 'mock-refresh-token' }),
      generateAccessToken: jest.fn().mockResolvedValue({ token: 'mock-access-token' }),
      rotateRefreshToken: jest.fn().mockResolvedValue({ token: 'rotated-refresh-token' }),
    }));
  });

  // ── refresh action ────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('passes maxAge to ctx.cookies.set when sessions.cookie.maxAge is configured', async () => {
      const upSessions = makeUpSessions(120000);
      const strapi = buildStrapi({ upSessions, sessionManagerCallable });
      const controller = require('../auth')({ strapi });

      const ctx = buildCtx({
        headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
        cookieValue: 'existing-refresh-token',
      });

      await controller.refresh(ctx);

      const options = getCookieOptions(ctx);
      expect(options).toHaveProperty('maxAge', 120000);
    });

    it('does not include maxAge when sessions.cookie.maxAge is not configured', async () => {
      const upSessions = makeUpSessions(undefined);
      const strapi = buildStrapi({ upSessions, sessionManagerCallable });
      const controller = require('../auth')({ strapi });

      const ctx = buildCtx({
        headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
        cookieValue: 'existing-refresh-token',
      });

      await controller.refresh(ctx);

      const options = getCookieOptions(ctx);
      expect(options.maxAge).toBeUndefined();
    });

    it('preserves all other cookie attributes alongside maxAge', async () => {
      const upSessions = makeUpSessions(60000);
      const strapi = buildStrapi({ upSessions, sessionManagerCallable });
      const controller = require('../auth')({ strapi });

      const ctx = buildCtx({
        headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
        cookieValue: 'existing-refresh-token',
      });

      await controller.refresh(ctx);

      const options = getCookieOptions(ctx);
      expect(options).toMatchObject({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60000,
        overwrite: true,
      });
    });

    it('does not set a cookie when httpOnly mode is disabled and no request header is present', async () => {
      const upSessions = {
        httpOnly: false,
        cookie: { name: 'refresh_token', maxAge: 120000 },
      };
      const strapi = buildStrapi({ upSessions, sessionManagerCallable });
      const controller = require('../auth')({ strapi });

      const ctx = buildCtx({
        headers: {}, // no x-strapi-refresh-cookie header
        cookieValue: null,
        body: { refreshToken: 'body-refresh-token' },
      });

      await controller.refresh(ctx);

      expect(ctx._cookiesSet).not.toHaveBeenCalled();
    });
  });

  // ── callback action (local provider) ─────────────────────────────────────

  describe('callback() — local provider', () => {
    beforeEach(() => {
      // Set global.strapi because sanitizeUser() (defined at module scope) references
      // the global `strapi` rather than the injected one.
      global.strapi = buildStrapi({
        upSessions: makeUpSessions(120000),
        sessionManagerCallable,
      });
    });

    afterEach(() => {
      delete global.strapi;
    });

    it('passes maxAge to ctx.cookies.set when sessions.cookie.maxAge is configured', async () => {
      const upSessions = makeUpSessions(120000);
      const strapi = buildStrapi({ upSessions, sessionManagerCallable });
      global.strapi = strapi;

      const controller = require('../auth')({ strapi });

      const ctx = buildCtx({
        body: { identifier: 'test@example.com', password: 'Password1!' },
        headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
      });

      await controller.callback(ctx);

      const options = getCookieOptions(ctx);
      expect(options).toHaveProperty('maxAge', 120000);
    });

    it('does not include maxAge when sessions.cookie.maxAge is not configured', async () => {
      const upSessions = makeUpSessions(undefined);
      const strapi = buildStrapi({ upSessions, sessionManagerCallable });
      global.strapi = strapi;

      const controller = require('../auth')({ strapi });

      const ctx = buildCtx({
        body: { identifier: 'test@example.com', password: 'Password1!' },
        headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
      });

      await controller.callback(ctx);

      const options = getCookieOptions(ctx);
      expect(options.maxAge).toBeUndefined();
    });
  });

  // ── callback action (OAuth provider) ─────────────────────────────────────

  describe('callback() — OAuth provider', () => {
    beforeEach(() => {
      global.strapi = buildStrapi({
        upSessions: makeUpSessions(120000),
        sessionManagerCallable,
      });
    });

    afterEach(() => {
      delete global.strapi;
    });

    it('passes maxAge to ctx.cookies.set when sessions.cookie.maxAge is configured', async () => {
      const upSessions = makeUpSessions(120000);
      const strapi = buildStrapi({ upSessions, sessionManagerCallable });
      global.strapi = strapi;

      const controller = require('../auth')({ strapi });

      const ctx = buildCtx({
        params: { provider: 'github' },
        headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
        query: { access_token: 'oauth-access-token' },
      });

      await controller.callback(ctx);

      const options = getCookieOptions(ctx);
      expect(options).toHaveProperty('maxAge', 120000);
    });
  });
});
