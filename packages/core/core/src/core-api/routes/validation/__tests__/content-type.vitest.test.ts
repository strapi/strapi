import { describe, test, expect, vi } from 'vitest';
import type { Core, Schema } from '@strapi/types';

import * as z from 'zod/v4';

import { CoreContentTypeRouteValidator } from '../content-type';
import { relationToInputSchema } from '../attributes';
import { createDocumentId } from '../../../../utils/transform-content-types-to-models';

// The private-attribute helpers read the `strapi` global; declare it so they take the
// uncached path instead of throwing a ReferenceError.
vi.stubGlobal('strapi', undefined);

describe('CoreContentTypeRouteValidator query parameters', () => {
  const strapi = {
    getModel: vi.fn(() => ({
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

describe('CoreContentTypeRouteValidator document IDs', () => {
  const strapi = {
    getModel: vi.fn(() => ({ attributes: { title: { type: 'string' } } })),
  } as unknown as Core.Strapi;

  const validator = new CoreContentTypeRouteValidator(strapi, 'api::article.article');

  // Strapi creates document IDs with cuid2, e.g. 'wv7wthxsdxj4jvqasrg8soyl'
  const documentId = createDocumentId();

  test('documentID accepts a generated document ID', () => {
    expect(validator.documentID.safeParse(documentId).success).toBe(true);
  });

  test('document accepts a generated documentId', () => {
    expect(validator.document.safeParse({ id: 1, documentId, title: 'Hello' }).success).toBe(true);
  });

  test('to-one relation input accepts a generated document ID', () => {
    const schema = relationToInputSchema({
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::category.category',
    } as Schema.Attribute.Relation);

    expect(schema.safeParse(documentId).success).toBe(true);
  });

  test('to-many relation input accepts generated document IDs', () => {
    const schema = relationToInputSchema({
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::tag.tag',
    } as Schema.Attribute.Relation);

    expect(schema.safeParse([documentId, createDocumentId()]).success).toBe(true);
  });
});
