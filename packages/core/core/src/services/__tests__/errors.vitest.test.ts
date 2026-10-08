import Koa from 'koa';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { errors } from '@strapi/utils';

import { errors as errorMiddleware } from '../../middlewares/errors';
import { formatApplicationError, isStrapiError } from '../errors';

/**
 * Stands in for an error class from another copy of `@strapi/utils`:
 * same name and shape, different identity.
 */
const createForeignError = (name: string, message = name) =>
  Object.assign(new Error(message), { name, details: {} });

describe('isStrapiError', () => {
  it('matches errors from core @strapi/utils', () => {
    expect(isStrapiError(new errors.ForbiddenError(), errors.ForbiddenError)).toBe(true);
    expect(isStrapiError(new errors.PolicyError(), errors.ForbiddenError)).toBe(true);
    expect(isStrapiError(new errors.ForbiddenError(), errors.UnauthorizedError)).toBe(false);
  });

  it('matches errors from another copy of @strapi/utils by name', () => {
    const forbidden = createForeignError('ForbiddenError');

    expect(forbidden instanceof errors.ForbiddenError).toBe(false);
    expect(isStrapiError(forbidden, errors.ForbiddenError)).toBe(true);
    expect(isStrapiError(forbidden, errors.ApplicationError)).toBe(true);
    expect(isStrapiError(forbidden, errors.UnauthorizedError)).toBe(false);
  });

  it('follows the class hierarchy for errors from another copy', () => {
    const policy = createForeignError('PolicyError');

    expect(isStrapiError(policy, errors.PolicyError)).toBe(true);
    expect(isStrapiError(policy, errors.ForbiddenError)).toBe(true);
    expect(isStrapiError(createForeignError('ForbiddenError'), errors.PolicyError)).toBe(false);
  });

  it('does not match other errors', () => {
    expect(isStrapiError(new Error('boom'), errors.ApplicationError)).toBe(false);
    expect(
      isStrapiError(Object.assign(new Error(), { name: 'ForbiddenError' }), errors.ForbiddenError)
    ).toBe(false);
    expect(isStrapiError(createForeignError('SomethingError'), errors.ApplicationError)).toBe(
      false
    );
    expect(isStrapiError({ name: 'ForbiddenError', details: {} }, errors.ForbiddenError)).toBe(
      false
    );
  });
});

describe('formatApplicationError', () => {
  it('maps errors from another copy of @strapi/utils to their status', () => {
    expect(formatApplicationError(createForeignError('UnauthorizedError') as never).status).toBe(
      401
    );
    expect(formatApplicationError(createForeignError('PolicyError') as never).status).toBe(403);
    expect(formatApplicationError(createForeignError('NotFoundError') as never).status).toBe(404);
    expect(formatApplicationError(createForeignError('ValidationError') as never).status).toBe(400);
  });
});

describe('errors middleware', () => {
  const requestThrowing = (error: Error) => {
    const app = new Koa();

    app.use(errorMiddleware({}, {} as never));
    app.use(() => {
      throw error;
    });

    return request(app.callback()).get('/');
  };

  it.each([
    ['UnauthorizedError', 401],
    ['ForbiddenError', 403],
    ['NotFoundError', 404],
    ['ValidationError', 400],
  ])('responds %s from another copy of @strapi/utils with %i', async (name, status) => {
    const response = await requestThrowing(createForeignError(name, 'Nope'));

    expect(response.status).toBe(status);
    expect(response.body).toEqual({
      data: null,
      error: { status, name, message: 'Nope', details: {} },
    });
  });
});
