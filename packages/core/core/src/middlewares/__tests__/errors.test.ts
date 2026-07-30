import Koa from 'koa';
import request from 'supertest';
import { errors as utilsErrors } from '@strapi/utils';

import { errors as errorMiddleware } from '../errors';

const PLUGIN_ERROR_MESSAGE = 'Plugin middleware failed';
const APPLICATION_ERROR_STATUS = 400;
const POLICY_ERROR_STATUS = 403;

class CustomPolicyError extends utilsErrors.PolicyError<'CustomPolicyError'> {
  constructor() {
    super(PLUGIN_ERROR_MESSAGE);
    this.name = 'CustomPolicyError';
  }
}

const LegacyApplicationError = class ApplicationError extends Error {
  details = {};
};

const LegacyPolicyError = class PolicyError extends LegacyApplicationError {
  name = 'PolicyError';
};

describe('Errors middleware', () => {
  test('_explicitStatus still exists', async () => {
    // Since we are using an internal variable of koa in our code,
    // we check that it doesn't change in newer updates
    const app = new Koa();

    app.use(async (ctx) => {
      ctx.body = 'hello';
      expect(ctx.response._explicitStatus).toBe(true);
    });

    expect.assertions(1);

    await request(app.callback()).get('/');
  });

  test('formats application errors created by another copy of @strapi/utils', async () => {
    let DuplicateApplicationError: typeof import('@strapi/utils').errors.ApplicationError;

    jest.isolateModules(() => {
      DuplicateApplicationError =
        jest.requireActual<typeof import('@strapi/utils')>('@strapi/utils').errors.ApplicationError;
    });

    const app = new Koa();
    global.strapi = {
      log: {
        error: jest.fn(),
      },
    } as typeof global.strapi;

    app.use(errorMiddleware());
    app.use(async () => {
      throw new DuplicateApplicationError(PLUGIN_ERROR_MESSAGE);
    });

    const response = await request(app.callback()).get('/');

    expect(response.status).toBe(APPLICATION_ERROR_STATUS);
    expect(response.body).toEqual({
      data: null,
      error: {
        status: APPLICATION_ERROR_STATUS,
        name: 'ApplicationError',
        message: PLUGIN_ERROR_MESSAGE,
        details: {},
      },
    });
  });

  test('preserves the status of policy errors created before cross-copy branding', async () => {
    const app = new Koa();
    global.strapi = {
      log: {
        error: jest.fn(),
      },
    } as typeof global.strapi;

    app.use(errorMiddleware());
    app.use(async () => {
      throw new LegacyPolicyError(PLUGIN_ERROR_MESSAGE);
    });

    const response = await request(app.callback()).get('/');

    expect(response.status).toBe(POLICY_ERROR_STATUS);
    expect(response.body.error).toMatchObject({
      status: POLICY_ERROR_STATUS,
      name: 'PolicyError',
      message: PLUGIN_ERROR_MESSAGE,
    });
  });

  test('preserves the status of custom policy error subclasses', async () => {
    const app = new Koa();

    app.use(errorMiddleware());
    app.use(async () => {
      throw new CustomPolicyError();
    });

    const response = await request(app.callback()).get('/');

    expect(response.status).toBe(POLICY_ERROR_STATUS);
  });
});
