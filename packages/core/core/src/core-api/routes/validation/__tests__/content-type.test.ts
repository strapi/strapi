import type { Core } from '@strapi/types';

import * as z from 'zod';

import { CoreContentTypeRouteValidator } from '../content-type';

describe('CoreContentTypeRouteValidator query parameters', () => {
  const strapi = {
    getModel: jest.fn(() => ({
      attributes: {
        title: { type: 'string' },
        rating: { type: 'integer' },
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
});
