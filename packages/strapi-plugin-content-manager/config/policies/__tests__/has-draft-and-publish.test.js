'use strict';

const hasDraftAndPublish = require('../has-draft-and-publish');

describe('hasDraftAndPublish policy', () => {
  beforeEach(() => {
    global.strapi = {
      errors: {
        forbidden: jest.fn(() => 'forbidden'),
      },
      contentTypes: {
        foo: {
          options: {
            draftAndPublish: true,
          },
        },
        bar: {
          options: {
            draftAndPublish: false,
          },
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It should succeed when the model has draft & publish enabled', () => {
    const ctx = { params: { model: 'foo' } };
    const next = jest.fn(() => 'next');

    const res = hasDraftAndPublish(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(res).toBe('next');
  });

  test(`It should fail when the model has draft & publish disabled`, () => {
    const ctx = { params: { model: 'bar' } };
    const next = jest.fn(() => 'next');

    expect(() => hasDraftAndPublish(ctx, next)).toThrowError('forbidden');
    expect(strapi.errors.forbidden).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test(`It should fail when the model doesn't exists`, () => {
    const ctx = { params: { model: 'foobar' } };
    const next = jest.fn(() => 'next');

    expect(() => hasDraftAndPublish(ctx, next)).toThrowError('forbidden');
    expect(strapi.errors.forbidden).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test(`It should fail when params.model isn't provided`, () => {
    const ctx = { params: {} };
    const next = jest.fn(() => 'next');

    expect(() => hasDraftAndPublish(ctx, next)).toThrowError('forbidden');
    expect(strapi.errors.forbidden).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
