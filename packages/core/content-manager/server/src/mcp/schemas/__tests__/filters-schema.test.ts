/**
 * Unit tests for the nested-filter capability added to buildFiltersSchema.
 * Top-level scalar filtering is covered via the derive-content-type test suite; here we
 * focus on relation/component nested field filters (gated behind the optional getModel)
 * and backward compatibility when no resolver is supplied.
 */
import type { Struct } from '@strapi/types';

import { buildFiltersSchema } from '../filters-schema';

const rootAttributes = {
  title: { type: 'string' },
  count: { type: 'integer' },
  author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
  reviewer: { type: 'relation', relation: 'oneToOne', target: 'admin::user' },
  seo: { type: 'component', component: 'shared.seo' },
} as unknown as Struct.SchemaAttributes;

const models: Record<string, { attributes: Struct.SchemaAttributes }> = {
  'api::author.author': {
    attributes: {
      name: { type: 'string' },
      age: { type: 'integer' },
      // relation-of-relation must NOT be expanded (bounded to one level)
      posts: { type: 'relation', relation: 'oneToMany', target: 'api::post.post' },
    } as unknown as Struct.SchemaAttributes,
  },
  'shared.seo': {
    attributes: {
      metaTitle: { type: 'string' },
    } as unknown as Struct.SchemaAttributes,
  },
};

const getModel = (uid: string) => models[uid];

describe('buildFiltersSchema — nested filters (with getModel)', () => {
  const schema = buildFiltersSchema(rootAttributes, null, getModel);

  it('still accepts top-level scalar filters', () => {
    expect(schema.safeParse({ title: { $eq: 'x' } }).success).toBe(true);
    expect(schema.safeParse({ count: { $gt: 3 } }).success).toBe(true);
  });

  it('accepts a nested relation field filter one level deep', () => {
    expect(schema.safeParse({ author: { name: { $contains: 'a' } } }).success).toBe(true);
    expect(schema.safeParse({ author: { age: { $gte: 18 } } }).success).toBe(true);
  });

  it('accepts a nested component field filter', () => {
    expect(schema.safeParse({ seo: { metaTitle: { $eq: 'Home' } } }).success).toBe(true);
  });

  it('rejects unknown nested fields on a relation target', () => {
    expect(schema.safeParse({ author: { unknownField: { $eq: 'x' } } }).success).toBe(false);
  });

  it('does not expand relation-of-relation (posts is not a filterable key on author)', () => {
    expect(schema.safeParse({ author: { posts: { title: { $eq: 'x' } } } }).success).toBe(false);
  });

  it('does not expose admin::user relation targets for nested filtering', () => {
    expect(schema.safeParse({ reviewer: { firstname: { $eq: 'x' } } }).success).toBe(false);
  });

  it('still supports logical operators combining nested filters', () => {
    expect(
      schema.safeParse({
        $and: [{ title: { $eq: 'x' } }, { author: { name: { $contains: 'a' } } }],
      }).success
    ).toBe(true);
  });
});

describe('buildFiltersSchema — backward compatibility (no getModel)', () => {
  const schema = buildFiltersSchema(rootAttributes, null);

  it('accepts top-level scalar filters', () => {
    expect(schema.safeParse({ title: { $eq: 'x' } }).success).toBe(true);
  });

  it('does NOT accept nested relation filters when no resolver is supplied', () => {
    expect(schema.safeParse({ author: { name: { $eq: 'x' } } }).success).toBe(false);
  });
});
