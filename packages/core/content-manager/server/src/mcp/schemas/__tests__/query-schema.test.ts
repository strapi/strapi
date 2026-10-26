/**
 * Unit tests for query-schema.ts — the `fields` and `populate` read-tool input schemas
 * plus the `buildInlinePathMatcher` helper that drives opt-in relation inlining. Schemas
 * are validated with `safeParse` against the model's real attribute set.
 */
import type { Struct } from '@strapi/types';

import {
  buildFieldsSchema,
  buildPopulateSchema,
  getPopulatableAttributeKeys,
  buildInlinePathMatcher,
} from '../query-schema';

const attributes = {
  title: { type: 'string' },
  count: { type: 'integer' },
  secret: { type: 'string', private: true },
  payload: { type: 'json' },
  body: { type: 'blocks' },
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

  it('accepts json and blocks fields (valid projections, excluded from sort/filter)', () => {
    expect(schema.safeParse(['payload']).success).toBe(true);
    expect(schema.safeParse(['body']).success).toBe(true);
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

describe('buildInlinePathMatcher', () => {
  it('opts nothing in when populate is absent (default = all relations stubbed)', () => {
    expect(buildInlinePathMatcher(undefined).hasAny).toBe(false);
    expect(buildInlinePathMatcher(null).hasAny).toBe(false);
    expect(buildInlinePathMatcher(undefined).shouldInline('author')).toBe(false);
  });

  it('array form matches only the named top-level paths (one level)', () => {
    const m = buildInlinePathMatcher(['author', 'tags']);
    expect(m.hasAny).toBe(true);
    expect(m.shouldInline('author')).toBe(true);
    expect(m.shouldInline('tags')).toBe(true);
    expect(m.shouldInline('editor')).toBe(false);
    // no deeper paths opted in
    expect(m.shouldInline('author.avatar')).toBe(false);
  });

  it('object form matches truthy keys, skips false/undefined', () => {
    const m = buildInlinePathMatcher({ author: true, tags: false });
    expect(m.shouldInline('author')).toBe(true);
    expect(m.shouldInline('tags')).toBe(false);
  });

  it('follows nested populate to inline deeper paths', () => {
    const m = buildInlinePathMatcher({ author: { populate: ['avatar'] } });
    expect(m.shouldInline('author')).toBe(true);
    expect(m.shouldInline('author.avatar')).toBe(true);
    expect(m.shouldInline('author.company')).toBe(false);
  });

  it('supports arbitrarily deep nested populate objects', () => {
    const m = buildInlinePathMatcher({ author: { populate: { company: { populate: ['ceo'] } } } });
    expect(m.shouldInline('author')).toBe(true);
    expect(m.shouldInline('author.company')).toBe(true);
    expect(m.shouldInline('author.company.ceo')).toBe(true);
    expect(m.shouldInline('author.company.founder')).toBe(false);
  });

  it('"*" at root inlines any relation one level under the root only', () => {
    const m = buildInlinePathMatcher('*');
    expect(m.shouldInline('author')).toBe(true);
    expect(m.shouldInline('tags')).toBe(true);
    expect(m.shouldInline('author.avatar')).toBe(false);
  });

  it('nested "*" inlines any relation one level under the nested prefix', () => {
    const m = buildInlinePathMatcher({ author: { populate: '*' } });
    expect(m.shouldInline('author')).toBe(true);
    expect(m.shouldInline('author.avatar')).toBe(true);
    expect(m.shouldInline('author.avatar.thumbnail')).toBe(false);
  });

  it('empty attribute path never matches', () => {
    const m = buildInlinePathMatcher('*');
    expect(m.shouldInline('')).toBe(false);
    expect(m.shouldInline(null)).toBe(false);
    expect(m.shouldInline(undefined)).toBe(false);
  });

  it('traverses dynamic-zone/morph "on" fragments against the parent path', () => {
    const m = buildInlinePathMatcher({
      blocks: { on: { 'shared.hero': { populate: ['author'] } } },
    });
    expect(m.shouldInline('blocks.author')).toBe(true);
    // the component UID is never part of the runtime relation path
    expect(m.shouldInline('blocks.on')).toBe(false);
  });

  it('supports multiple "on" fragments and wildcard populate within a fragment', () => {
    const m = buildInlinePathMatcher({
      blocks: {
        on: {
          'shared.hero': { populate: ['author'] },
          'shared.quote': { populate: '*' },
        },
      },
    });
    expect(m.shouldInline('blocks.author')).toBe(true);
    expect(m.shouldInline('blocks.speaker')).toBe(true);
  });
});
