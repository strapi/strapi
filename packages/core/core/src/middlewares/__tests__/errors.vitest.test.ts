import { describe, test, expect, vi, beforeEach } from 'vitest';
import Koa from 'koa';
import request from 'supertest';
import { errors as databaseErrors } from '@strapi/database';

import { errors as errorMiddleware } from '../errors';

const createApp = (error: unknown) => {
  const app = new Koa();

  app.use(errorMiddleware({}, { strapi: global.strapi }));
  app.use(async () => {
    throw error;
  });

  return app;
};

describe('Errors middleware', () => {
  beforeEach(() => {
    global.strapi = { log: { error: vi.fn() } } as any;
  });

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

  test.each([
    ['InvalidBooleanError', databaseErrors.InvalidBooleanError],
    ['InvalidDateError', databaseErrors.InvalidDateError],
    ['InvalidTimeError', databaseErrors.InvalidTimeError],
    ['InvalidDateTimeError', databaseErrors.InvalidDateTimeError],
    ['InvalidRelationError', databaseErrors.InvalidRelationError],
  ])('answers %s with a 400 ValidationError', async (_, ErrorClass) => {
    const error = new ErrorClass('invalid input');

    const res = await request(createApp(error).callback()).get('/');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      data: null,
      error: { status: 400, name: 'ValidationError', message: 'invalid input', details: {} },
    });
    expect(global.strapi.log.error).not.toHaveBeenCalled();
  });

  test('answers any other DatabaseError with a 500', async () => {
    const error = new databaseErrors.NotNullError({ column: 'title' });

    const res = await request(createApp(error).callback()).get('/');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({ status: 500, name: 'InternalServerError' });
    expect(global.strapi.log.error).toHaveBeenCalledWith(error);
  });

  test('answers a generic DatabaseError with a 500', async () => {
    const error = new databaseErrors.DatabaseError('connection lost');

    const res = await request(createApp(error).callback()).get('/');

    expect(res.status).toBe(500);
    expect(global.strapi.log.error).toHaveBeenCalledWith(error);
  });
});
