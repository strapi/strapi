import type { Context, Next } from 'koa';
import * as nexus from 'nexus';
import { describe, expect, it, vi } from 'vitest';
import { createStrapiMock as withStrapiType } from '../../../../../tests/utils';

import forgotPasswordMutation from '../forgot-password';
import resetPasswordMutation from '../reset-password';
import changePasswordMutation from '../change-password';
import loginMutation from '../login';
import registerMutation from '../register';
import { getRateLimitPath } from '../rate-limit';

const RATE_LIMIT_UID = 'plugin::users-permissions.rateLimit';

const createStrapiMock = (restPrefix = '/api') => {
  const forgotPassword = vi.fn(async (ctx: Context) => {
    ctx.body = { ok: true };
  });

  const resetPassword = vi.fn(async (ctx: Context) => {
    ctx.body = {
      jwt: 'jwt-token',
      user: { id: 1 },
    };
  });

  const callback = vi.fn(async (ctx: Context) => {
    ctx.body = { jwt: 'jwt-token', user: { id: 1 } };
  });

  const register = vi.fn(async (ctx: Context) => {
    ctx.body = { jwt: 'jwt-token', user: { id: 1 } };
  });

  const changePassword = vi.fn(async (ctx: Context) => {
    ctx.body = { jwt: 'jwt-token', user: { id: 1 } };
  });

  const rateLimitHandler = vi.fn(async (ctx: Context, next: Next) => next());
  const rateLimitFactory = vi.fn(() => rateLimitHandler);

  const authController = {
    forgotPassword,
    resetPassword,
    callback,
    register,
    changePassword,
  };

  const strapi = withStrapiType({
    config: {
      get: vi.fn((key: string, defaultValue: unknown) =>
        key === 'api.rest.prefix' ? restPrefix : defaultValue
      ),
    },
    middleware: vi.fn((uid: string) => {
      if (uid === RATE_LIMIT_UID) {
        return rateLimitFactory;
      }

      return undefined;
    }),
    plugin: vi.fn((pluginName: string) => {
      if (pluginName !== 'users-permissions') {
        return undefined;
      }

      return {
        controller: vi.fn((controllerName: string) => {
          if (controllerName !== 'auth') {
            return undefined;
          }

          return authController;
        }),
      };
    }),
  });

  return {
    strapi,
    authController,
    rateLimitFactory,
    rateLimitHandler,
  };
};

const createKoaContext = (): Context =>
  ({
    request: {
      body: {},
      path: '/graphql',
      ip: '203.0.113.1',
    },
  }) as Context;

const withContext = <T extends object>(value: T): T & Context => value as T & Context;

const createKoaContextWithResponse = (status = 200): Context => {
  const response = {
    _body: undefined as unknown,
    status,
    get body() {
      return this._body;
    },
    set body(value: unknown) {
      this._body = value;
      if (value == null) {
        this.status = 204;
      } else {
        this.status = 200;
      }
    },
  };

  return withContext({
    ...createKoaContext(),
    response,
    get body() {
      return response.body;
    },
    set body(value: unknown) {
      response.body = value;
    },
    get status() {
      return response.status;
    },
    set status(value: number) {
      response.status = value;
    },
  });
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

    rateLimitHandler.mockImplementationOnce(async (ctx: Context, next: Next) => {
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

    rateLimitHandler.mockImplementationOnce(async (ctx: Context, next: Next) => {
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
    const controllerEmails: string[] = [];

    authController.forgotPassword.mockImplementation(async (ctx: Context) => {
      controllerEmails.push(ctx.request.body.email);
      ctx.body = { ok: true };
    });
    rateLimitHandler.mockImplementation(async (ctx: Context, next: Next) => {
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
      resolve: (strapi: Parameters<typeof loginMutation>[0]['strapi'], koaContext: Context) =>
        loginMutation({ nexus, strapi }).resolve(
          null,
          { input: { identifier: 'user@example.com', password: 'Strapi1234' } },
          { koaContext }
        ),
      controller: 'callback' as const,
      routePath: '/api/auth/local',
    },
    {
      name: 'register',
      resolve: (strapi: Parameters<typeof registerMutation>[0]['strapi'], koaContext: Context) =>
        registerMutation({ nexus, strapi }).resolve(
          null,
          { input: { username: 'user', email: 'user@example.com', password: 'Strapi1234' } },
          { koaContext }
        ),
      controller: 'register' as const,
      routePath: '/api/auth/local/register',
    },
    {
      name: 'changePassword',
      resolve: (
        strapi: Parameters<typeof changePasswordMutation>[0]['strapi'],
        koaContext: Context
      ) =>
        changePasswordMutation({ nexus, strapi }).resolve(
          null,
          {
            currentPassword: 'Strapi1234',
            password: 'Strapi12345',
            passwordConfirmation: 'Strapi12345',
          },
          { koaContext }
        ),
      controller: 'changePassword' as const,
      routePath: '/api/auth/change-password',
    },
  ])(
    'runs users-permissions rateLimit before $name controller using $routePath',
    async ({ resolve, controller, routePath }) => {
      const { strapi, authController, rateLimitHandler } = createStrapiMock();
      const koaContext = createKoaContext();

      rateLimitHandler.mockImplementationOnce(async (ctx: Context, next: Next) => {
        expect(ctx.request.path).toBe(routePath);
        await next();
      });

      await resolve(strapi, koaContext);

      expect(authController[controller]).toHaveBeenCalledWith(koaContext);
      expect(rateLimitHandler.mock.invocationCallOrder[0]).toBeLessThan(
        authController[controller].mock.invocationCallOrder[0]
      );
      expect(koaContext.request.path).toBe('/graphql');
    }
  );
});
