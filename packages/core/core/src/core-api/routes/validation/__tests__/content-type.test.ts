import type { Core } from '@strapi/types';

import * as z from 'zod/v4';

import { CoreContentTypeRouteValidator } from '../content-type';

describe('CoreContentTypeRouteValidator query parameters', () => {
  const strapi = {
    getModel: jest.fn(() => ({
      attributes: {
        title: { type: 'string' },
        rating: { type: 'integer' },
        content: { type: 'blocks', required: false },
      },
    })),
  } as unknown as Core.Strapi;

  const validator = new CoreContentTypeRouteValidator(strapi, 'api::article.article');

  test('Zod enum-keyed records are exhaustive by default', () => {
    const exhaustiveRecord = z.record(z.enum(['title', 'rating']), z.string());

    expect(exhaustiveRecord.safeParse({ title: 'asc' }).success).toBe(false);
  });

  test('sort accepts sparse enum-keyed objects', () => {
    const { sort } = validator.queryParams(['sort']);

    expect(sort?.parse({ title: 'asc' })).toEqual({ title: 'asc' });
    expect(sort?.safeParse({ unknown: 'asc' }).success).toBe(false);
  });

  test('filters accept sparse enum-keyed objects', () => {
    const { filters } = validator.queryParams(['filters']);

    expect(filters?.parse({ title: { $eq: 'hello' } })).toEqual({
      title: { $eq: 'hello' },
    });
    expect(filters?.safeParse({ unknown: { $eq: 'hello' } }).success).toBe(false);
  });

  test('data accepts requests without optional blocks fields', () => {
    const { data } = validator;

    expect(data.safeParse({ title: 'Hello', rating: 5 }).success).toBe(true);
  });

  test('data requires blocks fields when configured as required', () => {
    const requiredStrapi = {
      getModel: jest.fn(() => ({
        attributes: {
          title: { type: 'string' },
          content: { type: 'blocks', required: true },
        },
      })),
    } as unknown as Core.Strapi;

    const requiredValidator = new CoreContentTypeRouteValidator(
      requiredStrapi,
      'api::article.article'
    );

    expect(requiredValidator.data.safeParse({ title: 'Hello' }).success).toBe(false);
    expect(requiredValidator.data.safeParse({ title: 'Hello', content: [] }).success).toBe(true);
  });
});
