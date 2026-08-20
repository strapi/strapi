import { z } from '@strapi/utils';

import { buildDataSchema } from '../derive-content-type-mcp-tools';
import { mockStrapi, baseModel, makeModel, makeDpModel, type TestAttrs } from '../test-fixtures';

// ---------------------------------------------------------------------------
// `data` input-schema derivation — relations and media.
//
// The xOne / xMany input shapes (bare documentId, long-hand, connect/disconnect/
// set), their strictness, and the JSON Schema they advertise. Scalar projection
// lives in `data-schema-scalars.test.ts`; components and dynamic zones in
// `data-schema-components.test.ts`.
// ---------------------------------------------------------------------------

describe('buildDataSchema | relations and media', () => {
  it('maps media attribute to z.any()', () => {
    const attrs = { cover: { type: 'media', multiple: false } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ cover: { id: 1 } }).success).toBe(true);
  });

  it('required relation/media use configuration-neutral hint wording (not the scalar guarantee)', () => {
    // Relation/media enforcement depends on api.documents.strictRelations, which is off by
    // default — so the scalar "the server enforces it when the entry is saved" would be false.
    const attrs = {
      title: { type: 'string', required: true },
      author: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::author.author',
        required: true,
      },
      cover: { type: 'media', required: true },
    } as TestAttrs;

    const nonDp = z.toJSONSchema(
      buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, { operation: 'update' })
    ) as { properties?: Record<string, { description?: string }> };
    // The scalar keeps its enforcement guarantee...
    expect(nonDp.properties?.title?.description).toContain('when the entry is saved');
    // ...while relation/media stay neutral about enforcement.
    for (const key of ['author', 'cover']) {
      const description = nonDp.properties?.[key]?.description ?? '';
      expect(description).toContain('Marked required in the content-type schema');
      expect(description).toContain('keep the entry complete');
      expect(description).not.toContain('the server enforces it');
    }

    // On a D&P model the relational wording uses the publish step, still without promising
    // server-side enforcement.
    const dp = z.toJSONSchema(buildDataSchema(mockStrapi, makeDpModel(attrs), attrs)) as {
      properties?: Record<string, { description?: string }>;
    };
    for (const key of ['author', 'cover']) {
      const description = dp.properties?.[key]?.description ?? '';
      expect(description).toContain('populate it before publishing');
      expect(description).not.toContain('the server enforces it');
    }
  });

  // ── relation fixtures ─────────────────────────────────────────────────────
  const relationModel = baseModel({
    attributes: {
      author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
      tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
      parent: { type: 'relation', relation: 'oneToOne', target: 'api::article.article' },
      comments: { type: 'relation', relation: 'oneToMany', target: 'api::comment.comment' },
    } as TestAttrs,
  });

  // ── xOne relation tests ───────────────────────────────────────────────────

  it('xOne relation accepts bare documentId, long-hand object, and null', () => {
    const attrs = {
      author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ author: 'z7v8zma53x01r6oceimv922b' }).success).toBe(true);
    expect(schema.safeParse({ author: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
    expect(schema.safeParse({ author: { documentId: 'abc' } }).success).toBe(true);
    expect(schema.safeParse({ author: null }).success).toBe(true);
    expect(schema.safeParse({ author: '' }).success).toBe(false);
    expect(schema.safeParse({ author: 123 }).success).toBe(false);
  });

  it('xOne relation accepts { documentId, locale, status } long-hand', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ author: { documentId: 'abc', locale: 'fr' } }).success).toBe(true);
    expect(
      schema.safeParse({ author: { documentId: 'abc', locale: 'fr', status: 'published' } }).success
    ).toBe(true);
    expect(schema.safeParse({ author: { documentId: 'abc', status: 'draft' } }).success).toBe(true);
  });

  it('xOne relation accepts null to clear', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ author: null }).success).toBe(true);
  });

  it('xOne relation rejects unknown keys in long-hand (strict)', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ author: { documentId: 'abc', foo: 'bar' } }).success).toBe(false);
  });

  it('xOne relation rejects empty string', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ author: '' }).success).toBe(false);
  });

  it('xOne relation rejects numeric id', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ author: 123 }).success).toBe(false);
  });

  // ── xMany relation tests ──────────────────────────────────────────────────

  it('xMany relation accepts { connect: [...] }', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: { connect: ['abc', 'def'] } }).success).toBe(true);
  });

  it('xMany relation accepts { disconnect: [...] }', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: { disconnect: ['abc'] } }).success).toBe(true);
  });

  it('xMany relation accepts { connect: [...], disconnect: [...] }', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: { connect: ['abc'], disconnect: ['def'] } }).success).toBe(
      true
    );
  });

  it('xMany relation accepts { set: [...] }', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: { set: ['abc', 'def'] } }).success).toBe(true);
  });

  it('xMany relation accepts { set: null }', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: { set: null } }).success).toBe(true);
  });

  it('xMany relation accepts empty object {}', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: {} }).success).toBe(true);
  });

  it('xMany connect entry accepts position', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(
      schema.safeParse({ tags: { connect: [{ documentId: 'x', position: { before: 'y' } }] } })
        .success
    ).toBe(true);
    expect(
      schema.safeParse({ tags: { connect: [{ documentId: 'x', position: { start: true } }] } })
        .success
    ).toBe(true);
  });

  it('xMany connect entry accepts locale and status', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(
      schema.safeParse({
        tags: { connect: [{ documentId: 'x', locale: 'fr', status: 'published' }] },
      }).success
    ).toBe(true);
  });

  it('xMany rejects bare documentId array (not a flat object)', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: ['abc'] }).success).toBe(false);
  });

  it('xMany rejects bare null (not a flat object)', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: null }).success).toBe(false);
  });

  it('xMany rejects non-string values in arrays', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: { connect: [123] } }).success).toBe(false);
  });

  it('xMany rejects unknown keys (strict)', () => {
    const schema = buildDataSchema(
      mockStrapi,
      relationModel,
      relationModel.attributes as TestAttrs
    );
    expect(schema.safeParse({ tags: { connect: ['a'], foo: 'bar' } }).success).toBe(false);
  });

  // ── JSON Schema regression tests ──────────────────────────────────────────

  it('xOne relation produces valid JSON Schema via z.toJSONSchema', () => {
    const attrs = {
      author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    const jsonSchema = z.toJSONSchema(schema) as {
      properties?: { author?: { anyOf?: Array<{ type?: string }> } };
    };
    const branches = jsonSchema.properties?.author?.anyOf;
    expect(Array.isArray(branches)).toBe(true);
    const types = (branches ?? []).map((b) => b.type);
    expect(types).toContain('string');
    expect(types).toContain('object');
    expect(types).toContain('null');
    // No untyped {} branch
    expect(branches?.some((b) => Object.keys(b).length === 0)).toBe(false);
  });

  it('xMany relation produces valid JSON Schema via z.toJSONSchema', () => {
    const attrs = {
      tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    const jsonSchema = z.toJSONSchema(schema) as {
      properties?: { tags?: { type?: string; properties?: Record<string, unknown> } };
    };
    const tagsSchema = jsonSchema.properties?.tags;
    // Must be a typed object, not a top-level anyOf union
    expect(tagsSchema?.type).toBe('object');
    expect(tagsSchema?.properties).toBeDefined();
    expect(Object.keys(tagsSchema?.properties ?? {})).toEqual(
      expect.arrayContaining(['connect', 'disconnect', 'set'])
    );
  });
});
