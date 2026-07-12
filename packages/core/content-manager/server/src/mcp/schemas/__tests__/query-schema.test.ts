/**
 * Unit tests for query-schema.ts — the `fields`, `populate`, and `maxDepth` read-tool
 * input schemas plus the `extractInlineRelationKeys` helper that drives opt-in relation
 * inlining. Schemas are validated with `safeParse` against the model's real attribute set.
 */
import type { Struct } from '@strapi/types';

import {
  buildFieldsSchema,
  buildPopulateSchema,
  buildMaxDepthSchema,
  getPopulatableAttributeKeys,
  extractInlineRelationKeys,
} from '../query-schema';

const attributes = {
  title: { type: 'string' },
  count: { type: 'integer' },
  secret: { type: 'string', private: true },
  author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
  tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
  cover: { type: 'media' },
  seo: { type: 'component', component: 'shared.seo' },
  blocks: { type: 'dynamiczone', components: ['shared.hero'] },
  privateRel: {
    type: 'relation',
    relation: 'oneToOne',
    target: 'api::x.x',
    private: true,
  },
} as unknown as Struct.SchemaAttributes;

describe('getPopulatableAttributeKeys', () => {
  it('returns relations, components, dynamic zones, and media (excluding private)', () => {
    expect(getPopulatableAttributeKeys(attributes).sort()).toEqual(
      ['author', 'blocks', 'cover', 'seo', 'tags'].sort()
    );
  });

  it('filters to permitted fields when provided', () => {
    const keys = getPopulatableAttributeKeys(attributes, new Set(['author', 'seo']));
    expect(keys.sort()).toEqual(['author', 'seo']);
  });
});

describe('buildFieldsSchema', () => {
  const schema = buildFieldsSchema(attributes);

  it('accepts the "*" wildcard', () => {
    expect(schema.safeParse('*').success).toBe(true);
  });

  it('accepts an array subset of scalar field names', () => {
    expect(schema.safeParse(['title', 'count']).success).toBe(true);
  });

  it('rejects non-scalar / relation field names', () => {
    expect(schema.safeParse(['author']).success).toBe(false);
  });

  it('rejects private scalar fields', () => {
    expect(schema.safeParse(['secret']).success).toBe(false);
  });

  it('is optional (absent value parses)', () => {
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it('is an optional never-schema when the model has no readable scalar fields', () => {
    const relOnly = { author: attributes.author } as Struct.SchemaAttributes;
    const s = buildFieldsSchema(relOnly);
    expect(s.safeParse(undefined).success).toBe(true);
    expect(s.safeParse(['anything']).success).toBe(false);
  });
});

describe('buildPopulateSchema', () => {
  const schema = buildPopulateSchema(attributes);

  it('accepts the "*" wildcard', () => {
    expect(schema.safeParse('*').success).toBe(true);
  });

  it('accepts an array of populatable attribute names', () => {
    expect(schema.safeParse(['author', 'seo', 'cover']).success).toBe(true);
  });

  it('accepts an object form with boolean and nested specs', () => {
    expect(
      schema.safeParse({ author: true, tags: { fields: ['name'], sort: 'name:asc' } }).success
    ).toBe(true);
  });

  it('rejects scalar attribute names', () => {
    expect(schema.safeParse(['title']).success).toBe(false);
  });

  it('is optional (absent value parses)', () => {
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it('is an optional never-schema when the model has nothing to populate', () => {
    const scalarOnly = { title: { type: 'string' } } as Struct.SchemaAttributes;
    const s = buildPopulateSchema(scalarOnly);
    expect(s.safeParse(undefined).success).toBe(true);
    expect(s.safeParse(['title']).success).toBe(false);
  });
});

describe('buildMaxDepthSchema', () => {
  const schema = buildMaxDepthSchema();

  it('accepts integers within [0, 10]', () => {
    expect(schema.safeParse(0).success).toBe(true);
    expect(schema.safeParse(3).success).toBe(true);
    expect(schema.safeParse(10).success).toBe(true);
  });

  it('rejects out-of-range and non-integer values', () => {
    expect(schema.safeParse(-1).success).toBe(false);
    expect(schema.safeParse(11).success).toBe(false);
    expect(schema.safeParse(1.5).success).toBe(false);
  });

  it('is optional', () => {
    expect(schema.safeParse(undefined).success).toBe(true);
  });
});

describe('extractInlineRelationKeys', () => {
  it('returns an empty set when populate is absent (default = all relations stubbed)', () => {
    expect(extractInlineRelationKeys(undefined, attributes).size).toBe(0);
    expect(extractInlineRelationKeys(null, attributes).size).toBe(0);
  });

  it('returns an empty set when attributes are unavailable', () => {
    expect(extractInlineRelationKeys('*', undefined).size).toBe(0);
  });

  it('"*" selects every non-private relation (not components/media)', () => {
    expect([...extractInlineRelationKeys('*', attributes)].sort()).toEqual(['author', 'tags']);
  });

  it('array form selects only the named relations', () => {
    expect([...extractInlineRelationKeys(['author', 'seo', 'cover'], attributes)]).toEqual([
      'author',
    ]);
  });

  it('object form selects relations with a truthy value', () => {
    const keys = extractInlineRelationKeys({ author: true, tags: false, seo: true }, attributes);
    expect([...keys]).toEqual(['author']);
  });

  it('never includes components, media, or private relations', () => {
    const keys = extractInlineRelationKeys(
      { seo: true, cover: true, blocks: true, privateRel: true },
      attributes
    );
    expect(keys.size).toBe(0);
  });
});
