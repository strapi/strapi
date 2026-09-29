'use strict';

/* eslint-env jest */

const forgotPasswordMutation = require('../forgot-password');
const resetPasswordMutation = require('../reset-password');
const changePasswordMutation = require('../change-password');
const loginMutation = require('../login');
const registerMutation = require('../register');
const { getRateLimitPath } = require('../rate-limit');

const RATE_LIMIT_UID = 'plugin::users-permissions.rateLimit';

const nexus = {
  nonNull: (type) => type,
};

const createStrapiMock = (restPrefix = '/api') => {
  const forgotPassword = jest.fn(async (ctx) => {
    ctx.body = { ok: true };
  });

  const resetPassword = jest.fn(async (ctx) => {
    ctx.body = {
      jwt: 'jwt-token',
      user: { id: 1 },
    };
  });

  const callback = jest.fn(async (ctx) => {
    ctx.body = { jwt: 'jwt-token', user: { id: 1 } };
  });

  const register = jest.fn(async (ctx) => {
    ctx.body = { jwt: 'jwt-token', user: { id: 1 } };
  });

  const changePassword = jest.fn(async (ctx) => {
    ctx.body = { jwt: 'jwt-token', user: { id: 1 } };
  });

  const rateLimitHandler = jest.fn(async (ctx, next) => next());
  const rateLimitFactory = jest.fn(() => rateLimitHandler);

  const authController = {
    forgotPassword,
    resetPassword,
    callback,
    register,
    changePassword,
  };

  const strapi = {
    config: {
      get: jest.fn((key, defaultValue) => (key === 'api.rest.prefix' ? restPrefix : defaultValue)),
    },
    middleware: jest.fn((uid) => {
      if (uid === RATE_LIMIT_UID) {
        return rateLimitFactory;
      }

      return undefined;
    }),
    plugin: jest.fn((pluginName) => {
      if (pluginName !== 'users-permissions') {
        return undefined;
      }

      return {
        controller: jest.fn((controllerName) => {
          if (controllerName !== 'auth') {
            return undefined;
          }

          return authController;
        }),
      };
    }),
  };

  return {
    strapi,
    authController,
    rateLimitFactory,
    rateLimitHandler,
  };
};

const createKoaContext = () => ({
  request: {
    body: {},
    path: '/graphql',
    ip: '203.0.113.1',
  },
});

const createKoaContextWithResponse = (status = 200) => {
  const response = {
    _body: undefined,
    status,
    get body() {
      return this._body;
    },
    set body(value) {
      this._body = value;
      if (value == null) {
        this.status = 204;
      } else {
        this.status = 200;
      }
    },
  };

  return {
    ...createKoaContext(),
    response,
    get body() {
      return response.body;
    },
    set body(value) {
      response.body = value;
    },
    get status() {
      return response.status;
    },
    set status(value) {
      response.status = value;
    },
  };
};

describe('GraphQL auth mutations rate limiting', () => {
  it.each([
    ['/api', '/auth/forgot-password', '/api/auth/forgot-password'],
    ['/custom/', '/auth/local', '/custom/auth/local'],
    ['custom', 'auth/reset-password', '/custom/auth/reset-password'],
    ['/', '/auth/change-password', '/auth/change-password'],
  ])('uses the REST prefix %s to build %s', (restPrefix, routeSuffix, expectedPath) => {
    const { strapi } = createStrapiMock(restPrefix);

    expect(getRateLimitPath(strapi, routeSuffix)).toBe(expectedPath);
  });

  it('runs users-permissions rateLimit before forgotPassword controller', async () => {
    const { strapi, authController, rateLimitFactory, rateLimitHandler } = createStrapiMock();
    const mutation = forgotPasswordMutation({ nexus, strapi });
    const koaContext = createKoaContext();

    rateLimitHandler.mockImplementationOnce(async (ctx, next) => {
      expect(ctx.request.path).toBe('/api/auth/forgot-password');
      return next();
    });

    await mutation.resolve(null, { email: 'victim@example.com' }, { koaContext });

    expect(strapi.middleware).toHaveBeenCalledWith(RATE_LIMIT_UID);
    expect(rateLimitFactory).toHaveBeenCalledWith({}, { strapi });
    expect(rateLimitHandler).toHaveBeenCalledWith(koaContext, expect.any(Function));
    expect(authController.forgotPassword).toHaveBeenCalledWith(koaContext);
    expect(rateLimitHandler.mock.invocationCallOrder[0]).toBeLessThan(
      authController.forgotPassword.mock.invocationCallOrder[0]
    );
  });

  it('reuses the forgotPassword rateLimit middleware across resolver calls', async () => {
    const { strapi, rateLimitFactory, rateLimitHandler } = createStrapiMock();
    const mutation = forgotPasswordMutation({ nexus, strapi });

    await mutation.resolve(
      null,
      { email: 'victim@example.com' },
      { koaContext: createKoaContext() }
    );
    await mutation.resolve(
      null,
      { email: 'victim@example.com' },
      { koaContext: createKoaContext() }
    );

    expect(rateLimitFactory).toHaveBeenCalledTimes(1);
    expect(rateLimitHandler).toHaveBeenCalledTimes(2);
  });

  it('runs users-permissions rateLimit before resetPassword controller', async () => {
    const { strapi, authController, rateLimitFactory, rateLimitHandler } = createStrapiMock();
    const mutation = resetPasswordMutation({ nexus, strapi });
    const koaContext = createKoaContext();

    rateLimitHandler.mockImplementationOnce(async (ctx, next) => {
      expect(ctx.request.path).toBe('/api/auth/reset-password');
      return next();
    });

    await mutation.resolve(
      null,
      {
        code: 'reset-token',
        password: 'Strapi1234',
        passwordConfirmation: 'Strapi1234',
      },
      { koaContext }
    );

    expect(strapi.middleware).toHaveBeenCalledWith(RATE_LIMIT_UID);
    expect(rateLimitFactory).toHaveBeenCalledWith({}, { strapi });
    expect(rateLimitHandler).toHaveBeenCalledWith(koaContext, expect.any(Function));
    expect(authController.resetPassword).toHaveBeenCalledWith(koaContext);
    expect(rateLimitHandler.mock.invocationCallOrder[0]).toBeLessThan(
      authController.resetPassword.mock.invocationCallOrder[0]
    );
  });

  it('serializes operations sharing a GraphQL Koa context', async () => {
    const { strapi, authController, rateLimitHandler } = createStrapiMock();
    const mutation = forgotPasswordMutation({ nexus, strapi });
    const koaContext = createKoaContext();
    const controllerEmails = [];

    authController.forgotPassword.mockImplementation(async (ctx) => {
      controllerEmails.push(ctx.request.body.email);
      ctx.body = { ok: true };
    });
    rateLimitHandler.mockImplementation(async (ctx, next) => {
      await Promise.resolve();
      return next();
    });

    await Promise.all([
      mutation.resolve(null, { email: 'decoy-one@example.com' }, { koaContext }),
      mutation.resolve(null, { email: 'decoy-two@example.com' }, { koaContext }),
      mutation.resolve(null, { email: 'target@example.com' }, { koaContext }),
    ]);

    expect(controllerEmails).toEqual([
      'decoy-one@example.com',
      'decoy-two@example.com',
      'target@example.com',
    ]);
    expect(koaContext.request).toMatchObject({ body: {}, path: '/graphql' });
  });

  it('restores Koa request and response state when a controller throws', async () => {
    const { strapi, authController } = createStrapiMock();
    const mutation = forgotPasswordMutation({ nexus, strapi });
    const originalBody = { preserved: true };
    const originalParams = { route: 'graphql' };
    const originalResponseBody = { response: 'preserved' };
    const koaContext = {
      ...createKoaContext(),
      params: originalParams,
      body: originalResponseBody,
    };
    koaContext.request.body = originalBody;
    authController.forgotPassword.mockRejectedValueOnce(new Error('controller failure'));

    await expect(
      mutation.resolve(null, { email: 'victim@example.com' }, { koaContext })
    ).rejects.toThrow('controller failure');

    expect(koaContext.request.body).toBe(originalBody);
    expect(koaContext.request.path).toBe('/graphql');
    expect(koaContext.params).toBe(originalParams);
    expect(koaContext.body).toBe(originalResponseBody);
  });

  it('uses the GraphQL success status when a controller throws', async () => {
    const { strapi, authController } = createStrapiMock();
    const mutation = forgotPasswordMutation({ nexus, strapi });
    const koaContext = createKoaContextWithResponse(404);
    authController.forgotPassword.mockRejectedValueOnce(new Error('controller failure'));

    await expect(
      mutation.resolve(null, { email: 'victim@example.com' }, { koaContext })
    ).rejects.toThrow('controller failure');

    expect(koaContext.status).toBe(200);
  });

  it('preserves the controller response status after clearing a response body', async () => {
    const { strapi } = createStrapiMock();
    const mutation = forgotPasswordMutation({ nexus, strapi });
    const koaContext = createKoaContextWithResponse(404);

    await mutation.resolve(null, { email: 'victim@example.com' }, { koaContext });

    expect(koaContext.body).toBeUndefined();
    expect(koaContext.status).toBe(200);
  });

  it.each([
    {
      name: 'login',
      createMutation: loginMutation,
      args: { input: { identifier: 'user@example.com', password: 'Strapi1234' } },
      controller: 'callback',
      routePath: '/api/auth/local',
    },
    {
      name: 'register',
      createMutation: registerMutation,
      args: { input: { username: 'user', email: 'user@example.com', password: 'Strapi1234' } },
      controller: 'register',
      routePath: '/api/auth/local/register',
    },
    {
      name: 'changePassword',
      createMutation: changePasswordMutation,
      args: {
        currentPassword: 'Strapi1234',
        password: 'Strapi12345',
        passwordConfirmation: 'Strapi12345',
      },
      controller: 'changePassword',
      routePath: '/api/auth/change-password',
    },
  ])(
    'runs users-permissions rateLimit before $name controller using $routePath',
    async ({ createMutation, args, controller, routePath }) => {
      const { strapi, authController, rateLimitHandler } = createStrapiMock();
      const mutation = createMutation({ nexus, strapi });
      const koaContext = createKoaContext();

      rateLimitHandler.mockImplementationOnce(async (ctx, next) => {
        expect(ctx.request.path).toBe(routePath);
        await next();
      });

      await mutation.resolve(null, args, { koaContext });

      expect(authController[controller]).toHaveBeenCalledWith(koaContext);
      expect(rateLimitHandler.mock.invocationCallOrder[0]).toBeLessThan(
        authController[controller].mock.invocationCallOrder[0]
      );
      expect(koaContext.request.path).toBe('/graphql');
    }
  );
});
