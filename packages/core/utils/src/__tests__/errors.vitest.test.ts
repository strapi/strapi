import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as yup from 'yup';

import * as errors from '../errors';

/** A second copy of the module, as an app with two versions of `@strapi/utils` loads it. */
let otherCopy: typeof errors;

beforeAll(async () => {
  vi.resetModules();
  otherCopy = await import('../errors');
});

describe('errors from another copy of @strapi/utils', () => {
  it('are a different class', () => {
    expect(otherCopy.PolicyError).not.toBe(errors.PolicyError);
  });

  it('match their own class and every Strapi class above it', () => {
    const error = new otherCopy.PolicyError();

    expect(error).toBeInstanceOf(errors.PolicyError);
    expect(error).toBeInstanceOf(errors.ForbiddenError);
    expect(error).toBeInstanceOf(errors.ApplicationError);
  });

  it('do not match other Strapi classes', () => {
    expect(new otherCopy.ForbiddenError()).not.toBeInstanceOf(errors.PolicyError);
    expect(new otherCopy.ForbiddenError()).not.toBeInstanceOf(errors.UnauthorizedError);
  });

  it('match through the yup validation error', () => {
    const yupError = new yup.ValidationError('Invalid', null, 'title');

    expect(new otherCopy.YupValidationError(yupError)).toBeInstanceOf(errors.ValidationError);
  });

  it('carry nothing extra on the error itself', () => {
    const error = new otherCopy.NotFoundError();

    expect(Object.getOwnPropertySymbols(error)).toEqual([]);
    expect({ ...error }).not.toBeInstanceOf(errors.NotFoundError);
  });
});

describe('instanceof on Strapi errors', () => {
  it('does not match an error that only shares the name', () => {
    const error = Object.assign(new Error('Nope'), { name: 'ForbiddenError', details: {} });

    expect(error).not.toBeInstanceOf(errors.ForbiddenError);
  });

  it('does not match non-objects', () => {
    expect(null instanceof errors.ApplicationError).toBe(false);
    expect((undefined as unknown) instanceof errors.ApplicationError).toBe(false);
    expect(('ForbiddenError' as unknown) instanceof errors.ForbiddenError).toBe(false);
  });

  it('keeps a class declared outside Strapi to its own instances', () => {
    class CustomError extends errors.ApplicationError {}

    expect(new CustomError()).toBeInstanceOf(CustomError);
    expect(new CustomError()).toBeInstanceOf(otherCopy.ApplicationError);
    expect(new otherCopy.ApplicationError()).not.toBeInstanceOf(CustomError);
  });
});
