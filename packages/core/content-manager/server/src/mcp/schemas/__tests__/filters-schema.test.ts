/**
 * Unit tests for the nested-filter capability added to buildFiltersSchema.
 * Top-level scalar filtering is covered via the derive-content-type test suite; here we
 * focus on component nested field filters (gated behind the optional getModel) and
 * backward compatibility when no resolver is supplied.
 *
 * Relation targets are intentionally NOT expanded into nested filters: filtering on a
 * related entry's fields would let a caller probe fields/entries of the target type
 * that their own read permission on the source type does not grant (the permission
 * checker only sanitizes against the source type's fields, not the target's).
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

  it('accepts a nested component field filter', () => {
    expect(schema.safeParse({ seo: { metaTitle: { $eq: 'Home' } } }).success).toBe(true);
  });

  it('does not expand relation targets into nested filters', () => {
    expect(schema.safeParse({ author: { name: { $contains: 'a' } } }).success).toBe(false);
    expect(schema.safeParse({ author: { age: { $gte: 18 } } }).success).toBe(false);
  });

  it('does not expose admin::user relation targets for nested filtering', () => {
    expect(schema.safeParse({ reviewer: { firstname: { $eq: 'x' } } }).success).toBe(false);
  });

  it('still supports logical operators combining nested (component) filters', () => {
    expect(
      schema.safeParse({
        $and: [{ title: { $eq: 'x' } }, { seo: { metaTitle: { $eq: 'Home' } } }],
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
