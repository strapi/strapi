'use strict';

/* eslint-env jest */

const createContext = require('../../../../../../../tests/helpers/create-context');
const {
  createMockSessionManager,
} = require('../../../../../../../tests/helpers/create-session-manager-mock');

const createAuthController = () => require('../auth')({ strapi: global.strapi });

const REFRESH_TOKEN = 'refresh-token';
const ACCESS_TOKEN = 'access-token';

const customCookieConfig = {
  name: 'custom_refresh',
  path: '/custom-path',
  domain: 'example.com',
  sameSite: 'strict',
  secure: true,
  maxAge: 3600000,
};

describe('Auth controller - refresh token delivery (sessions.httpOnly)', () => {
  let controller;
  let originApi;
  let userService;
  let sessionsConfig;

  const user = { id: 7, username: 'jane', email: 'jane@example.com', password: 'hashed' };

  beforeEach(() => {
    sessionsConfig = { httpOnly: false };

    const mocks = createMockSessionManager({
      generateRefreshToken: jest.fn(() => Promise.resolve({ token: REFRESH_TOKEN })),
      generateAccessToken: jest.fn(() => Promise.resolve({ token: ACCESS_TOKEN })),
      invalidateRefreshToken: jest.fn(() => Promise.resolve()),
    });
    originApi = mocks.originApi;

    userService = {
      add: jest.fn((data) => Promise.resolve({ id: user.id, ...data })),
      edit: jest.fn(() => Promise.resolve(user)),
      validatePassword: jest.fn(() => Promise.resolve(true)),
    };

    const queries = {
      'plugin::users-permissions.role': { findOne: jest.fn(() => Promise.resolve({ id: 1 })) },
      'plugin::users-permissions.user': {
        count: jest.fn(() => Promise.resolve(0)),
        findOne: jest.fn(() => Promise.resolve(user)),
      },
    };

    global.strapi = {
      config: {
        get: jest.fn((path, defaultValue) => {
          if (path === 'plugin::users-permissions.jwtManagement') {
            return 'refresh';
          }
          if (path === 'plugin::users-permissions.sessions') {
            return sessionsConfig;
          }
          if (path === 'plugin::users-permissions') {
            return {};
          }
          return defaultValue;
        }),
      },
      store: jest.fn(() => ({
        get: jest.fn(() =>
          Promise.resolve({
            allow_register: true,
            default_role: 'authenticated',
            email_confirmation: false,
            unique_email: true,
          })
        ),
      })),
      db: { query: jest.fn((uid) => queries[uid]) },
      plugins: { 'users-permissions': { services: { user: userService } } },
      getModel: jest.fn(() => ({})),
      contentAPI: {
        sanitize: {
          output: jest.fn(({ password: _password, ...rest }) => Promise.resolve(rest)),
        },
      },
      sessionManager: mocks.sessionManager,
      log: { error: jest.fn() },
    };

    controller = createAuthController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createCtx = (body, headers = {}) =>
    createContext(
      { body },
      {
        send: jest.fn(),
        state: { user: { id: user.id } },
        cookies: { get: jest.fn(), set: jest.fn() },
        request: { body, header: headers, headers },
      }
    );

  const endpoints = [
    {
      name: 'register',
      call: (ctx) => controller.register(ctx),
      body: () => ({ username: 'jane', email: 'jane@example.com', password: 'Passw0rd-test-1' }),
    },
    {
      name: 'changePassword',
      call: (ctx) => controller.changePassword(ctx),
      body: () => ({
        currentPassword: 'Passw0rd-test-1',
        password: 'Passw0rd-test-2',
        passwordConfirmation: 'Passw0rd-test-2',
      }),
    },
    {
      name: 'resetPassword',
      call: (ctx) => controller.resetPassword(ctx),
      body: () => ({
        code: 'reset-code',
        password: 'Passw0rd-test-2',
        passwordConfirmation: 'Passw0rd-test-2',
      }),
    },
  ];

  describe.each(endpoints)('$name', ({ call, body }) => {
    test('returns the refresh token in the body and sets no cookie when httpOnly is disabled', async () => {
      const ctx = createCtx(body());

      await call(ctx);

      expect(ctx.cookies.set).not.toHaveBeenCalled();
      expect(ctx.send).toHaveBeenCalledWith({
        jwt: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        user: expect.objectContaining({ id: user.id }),
      });
    });

    test('sets the refresh cookie and omits refreshToken from the body when sessions.httpOnly is true', async () => {
      sessionsConfig = { httpOnly: true, cookie: customCookieConfig };
      const ctx = createCtx(body());

      await call(ctx);

      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'custom_refresh',
        REFRESH_TOKEN,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/custom-path',
          domain: 'example.com',
          maxAge: 3600000,
        })
      );
      expect(ctx.send).toHaveBeenCalledTimes(1);
      const payload = ctx.send.mock.calls[0][0];
      expect(payload).not.toHaveProperty('refreshToken');
      expect(payload).toEqual({
        jwt: ACCESS_TOKEN,
        user: expect.objectContaining({ id: user.id }),
      });
    });

    test('sets the default refresh cookie when the request opts in with x-strapi-refresh-cookie', async () => {
      const ctx = createCtx(body(), { 'x-strapi-refresh-cookie': 'httpOnly' });

      await call(ctx);

      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'strapi_up_refresh',
        REFRESH_TOKEN,
        expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
      );
      expect(ctx.send.mock.calls[0][0]).not.toHaveProperty('refreshToken');
    });
  });

  test('changePassword still revokes existing sessions before issuing new tokens', async () => {
    sessionsConfig = { httpOnly: true };
    const ctx = createCtx(endpoints[1].body());

    await controller.changePassword(ctx);

    expect(originApi.invalidateRefreshToken).toHaveBeenCalledWith(String(user.id));
    expect(originApi.invalidateRefreshToken.mock.invocationCallOrder[0]).toBeLessThan(
      originApi.generateRefreshToken.mock.invocationCallOrder[0]
    );
  });
});
