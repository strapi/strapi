import { z } from '@strapi/utils';

import {
  deriveDisplayedContentTypeMcpToolDefinitions,
  buildDataSchema,
} from '../derive-content-type-mcp-tools';
import {
  mockStrapi,
  mockContext,
  mockUser,
  baseModel,
  makeModel,
  makeDpModel,
  makeFieldRestrictedAbility,
  type TestAttrs,
} from '../test-fixtures';

// ---------------------------------------------------------------------------
// `data` input-schema derivation: attribute mapping, required/min projection by
// operation + draftAndPublish, component/dynamic-zone handling, and the hints
// surfaced to MCP clients. Extracted from derive-content-type-mcp-tools.test.ts.
// ---------------------------------------------------------------------------

describe('buildDataSchema', () => {
  it('accepts an empty attributes object and produces a strict empty schema', () => {
    const schema = buildDataSchema(mockStrapi, makeModel({}), {});
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ unknownKey: 'x' }).success).toBe(false);
  });

  it('maps string attribute to z.string()', () => {
    const attrs = { title: { type: 'string' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
    expect(schema.safeParse({ title: 123 }).success).toBe(false);
  });

  it('maps integer attribute to z.number().int()', () => {
    const attrs = { count: { type: 'integer' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ count: 5 }).success).toBe(true);
    expect(schema.safeParse({ count: 5.5 }).success).toBe(false);
    expect(schema.safeParse({ count: 'five' }).success).toBe(false);
  });

  it('maps boolean attribute to z.boolean()', () => {
    const attrs = { active: { type: 'boolean' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ active: true }).success).toBe(true);
    expect(schema.safeParse({ active: 'yes' }).success).toBe(false);
  });

  it('maps enumeration to z.enum([...]) with known values', () => {
    const attrs = {
      status: { type: 'enumeration', enum: ['draft', 'published', 'archived'] },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ status: 'draft' }).success).toBe(true);
    expect(schema.safeParse({ status: 'invalid' }).success).toBe(false);
  });

  it('makes required scalar attributes required on non-D&P create (hard gate matches enforcement)', () => {
    const attrs = { title: { type: 'string', required: true } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
  });

  it('makes non-required attributes optional', () => {
    const attrs = { title: { type: 'string', required: false } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
  });

  it('Layer A: D&P create relaxes required scalar + relation + multiple media to optional', () => {
    const attrs = {
      title: { type: 'string', required: true },
      author: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::author.author',
        required: true,
      },
      gallery: { type: 'media', multiple: true, required: true },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs);
    // Draft create parity: an empty draft is accepted (admin/REST draft writes skip required).
    expect(schema.safeParse({}).success).toBe(true);
    // Values still accepted when provided.
    expect(schema.safeParse({ title: 'hi', author: 'abc', gallery: [{ id: 1 }] }).success).toBe(
      true
    );
  });

  it('Layer A: non-D&P create keeps required scalar gate but relaxes required relation/media', () => {
    const attrs = {
      title: { type: 'string', required: true },
      author: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::author.author',
        required: true,
      },
      gallery: { type: 'media', multiple: true, required: true },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    // Required scalar still enforced (published write, entity validator gates it).
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ author: 'abc', gallery: [{ id: 1 }] }).success).toBe(false);
    // Required relation/media are flag-dependent/lenient by default — never hard-gated.
    expect(schema.safeParse({ title: 'hi' }).success).toBe(true);
  });

  it('update mode relaxes required scalars even on a non-D&P model (update parity)', () => {
    const attrs = { title: { type: 'string', required: true } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
  });

  it('excludes system keys (id, documentId, createdAt, updatedAt, publishedAt) via isWritableAttribute', () => {
    const attrs = {
      id: { type: 'integer' },
      documentId: { type: 'string' },
      createdAt: { type: 'datetime' },
      updatedAt: { type: 'datetime' },
      publishedAt: { type: 'datetime' },
      createdBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user', writable: false },
      updatedBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user', writable: false },
      title: { type: 'string' },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    // Only title should be writable
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
    // System keys must be rejected (strict mode excludes them from the shape entirely)
    expect(schema.safeParse({ title: 'hello', id: 1 }).success).toBe(false);
    expect(schema.safeParse({ title: 'hello', documentId: 'abc' }).success).toBe(false);
    expect(schema.safeParse({ title: 'hello', createdAt: '2024-01-01' }).success).toBe(false);
  });

  it('rejects unknown keys (strict mode — MCP boundary enforces field names)', () => {
    const attrs = { title: { type: 'string' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ title: 'hello', unknownField: 'x' }).success).toBe(false);
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
  });

  it('derives per-ct schema that rejects wrong type on known field', () => {
    const attrs = { count: { type: 'integer', required: true } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ count: 'not-a-number' }).success).toBe(false);
  });

  it('carries minLength / maxLength constraints on string attributes', () => {
    const attrs = {
      slug: { type: 'string', minLength: 3, maxLength: 50, required: true },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ slug: 'ab' }).success).toBe(false); // too short
    expect(schema.safeParse({ slug: 'abc' }).success).toBe(true);
  });

  it('draft writes relax minLength / min but keep maxLength / max (admin draft parity)', () => {
    // Admin + entity validators skip minimum checks on drafts but keep maximums (column limits).
    const attrs = {
      slug: { type: 'string', minLength: 3, maxLength: 5 },
      score: { type: 'integer', min: 10, max: 20 },
    } as TestAttrs;

    // D&P create targets a draft → below-minimum accepted, above-maximum still rejected.
    const dpCreate = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs);
    expect(dpCreate.safeParse({ slug: 'ab', score: 1 }).success).toBe(true);
    expect(dpCreate.safeParse({ slug: 'toolong' }).success).toBe(false);
    expect(dpCreate.safeParse({ score: 99 }).success).toBe(false);

    // D&P update also targets a draft → same leniency.
    const dpUpdate = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(dpUpdate.safeParse({ slug: 'ab', score: 1 }).success).toBe(true);
  });

  it('non-D&P writes keep minLength / min (published — entity validator enforces it)', () => {
    const attrs = {
      slug: { type: 'string', minLength: 3 },
      score: { type: 'integer', min: 10 },
    } as TestAttrs;

    // Published create keeps the lower bound.
    const create = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(create.safeParse({ slug: 'ab' }).success).toBe(false);
    expect(create.safeParse({ score: 1 }).success).toBe(false);

    // A non-D&P update is published too, so the lower bound stays.
    const update = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(update.safeParse({ slug: 'ab' }).success).toBe(false);
    expect(update.safeParse({ score: 1 }).success).toBe(false);
  });

  it('draft writes relax repeatable-component and dynamic-zone min but keep max', () => {
    // Aggregate minima follow the same draft projection as scalar min/minLength: admin and
    // entity validation skip them on drafts, so a draft must be able to clear the list.
    const attrs = {
      links: { type: 'component', component: 'shared.seo', repeatable: true, min: 2, max: 3 },
      sections: { type: 'dynamiczone', components: ['shared.seo'], min: 2, max: 3 },
    } as TestAttrs;

    // D&P create targets a draft → below-minimum (including empty) accepted.
    const dpCreate = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs);
    expect(dpCreate.safeParse({ links: [], sections: [] }).success).toBe(true);
    // ...but the maximum still applies (it is not draft-exempt).
    expect(dpCreate.safeParse({ links: [{}, {}, {}, {}] }).success).toBe(false);
    expect(dpCreate.safeParse({ sections: [{}, {}, {}, {}] }).success).toBe(false);

    // D&P update also targets a draft → same leniency.
    const dpUpdate = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(dpUpdate.safeParse({ links: [], sections: [] }).success).toBe(true);
  });

  it('non-D&P writes keep repeatable-component and dynamic-zone min (published)', () => {
    const attrs = {
      links: { type: 'component', component: 'shared.seo', repeatable: true, min: 2 },
      sections: { type: 'dynamiczone', components: ['shared.seo'], min: 2 },
    } as TestAttrs;

    // Published create keeps the aggregate lower bound.
    const create = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(create.safeParse({ links: [] }).success).toBe(false);
    expect(create.safeParse({ sections: [] }).success).toBe(false);
    expect(create.safeParse({ links: [{}, {}], sections: [{}, {}] }).success).toBe(true);

    // A non-D&P update is published too, so the bound stays.
    const update = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(update.safeParse({ links: [] }).success).toBe(false);
    expect(update.safeParse({ sections: [] }).success).toBe(false);
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

  it('maps media attribute to z.any()', () => {
    const attrs = { cover: { type: 'media', multiple: false } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ cover: { id: 1 } }).success).toBe(true);
  });

  it('maps component attribute to a structured object schema', () => {
    const attrs = { seo: { type: 'component', component: 'shared.seo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    // Valid shape: all fields from shared.seo
    expect(
      schema.safeParse({ seo: { title: 'My title', description: 'desc', url: '/foo' } }).success
    ).toBe(true);
    // Unknown key on the component object is rejected (strict mode)
    expect(schema.safeParse({ seo: { title: 'x', unknownKey: 'bad' } }).success).toBe(false);
    // Wrong type rejected
    expect(schema.safeParse({ seo: 'not-an-object' }).success).toBe(false);
  });

  it('component schema produces non-empty JSON Schema properties (regression)', () => {
    const attrs = { seo: { type: 'component', component: 'shared.seo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    const jsonSchema = z.toJSONSchema(schema) as {
      properties?: { seo?: { properties?: { title?: { type?: string } } } };
    };
    expect(jsonSchema.properties?.seo?.properties?.title?.type).toBe('string');
  });

  it('repeatable component maps to array of structured objects', () => {
    const attrs = {
      tags: { type: 'component', component: 'shared.seo', repeatable: true },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ tags: [{ title: 'a' }, { title: 'b' }] }).success).toBe(true);
    expect(schema.safeParse({ tags: { title: 'a' } }).success).toBe(false); // must be array
    expect(schema.safeParse({ tags: [{ title: 'a', unknownKey: 'x' }] }).success).toBe(false);
  });

  it('nested component attributes recurse', () => {
    const attrs = { nested: { type: 'component', component: 'shared.nested' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    // valid nested shape
    expect(
      schema.safeParse({
        nested: { label: 'hi', inner: { title: 't', description: 'd', url: '/u' } },
      }).success
    ).toBe(true);
    // wrong type on nested sub-component
    expect(schema.safeParse({ nested: { label: 'hi', inner: 'not-an-object' } }).success).toBe(
      false
    );
  });

  it('D&P create: required scalar inside a component is relaxed (mode propagates)', () => {
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs);
    // Passing the component but omitting its required scalar — accepted post-fix.
    expect(schema.safeParse({ seo: {} }).success).toBe(true);
    // Required nested relation is also relaxed (divergence coverage, not propagation proof).
    expect(schema.safeParse({ seo: { title: 't' } }).success).toBe(true);
  });

  it('partial update: required scalar inside a component is relaxed on the id patch branch', () => {
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    // With an id the server UPDATEs that row, so omitting the required scalar is a no-op edit.
    expect(schema.safeParse({ seo: { id: 42 } }).success).toBe(true);
    expect(schema.safeParse({ seo: { id: 42, title: 't' } }).success).toBe(true);
    // String ids (documentId-style keys / numeric strings from JSON clients) are accepted too.
    expect(schema.safeParse({ seo: { id: '42' } }).success).toBe(true);
  });

  it('partial update: id-less component is validated as a create (replacement, not a patch)', () => {
    // Regression: an id-less component makes the server DELETE the old row and CREATE a new
    // one, so blanket update-optionality would let `{ seo: {} }` persist a replacement missing
    // required nested fields. The create branch must gate it.
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(schema.safeParse({ seo: {} }).success).toBe(false);
    // Supplying the required scalar satisfies the create branch (the required nested relation
    // is never hard-gated — flag-dependent, lenient by default).
    expect(schema.safeParse({ seo: { title: 't' } }).success).toBe(true);
  });

  it('D&P partial update: id-less component replacement stays lenient (draft target)', () => {
    // A D&P update edits the draft, and drafts skip required validation — so the create
    // branch is relaxed here too, matching admin draft behaviour.
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(schema.safeParse({ seo: {} }).success).toBe(true);
    expect(schema.safeParse({ seo: { id: 42 } }).success).toBe(true);
  });

  it('partial update: repeatable component mixes id patches and id-less creates per item', () => {
    const attrs = {
      seos: { type: 'component', component: 'shared.reqseo', repeatable: true },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    // Keep one row by id, add a fully-specified new one.
    expect(schema.safeParse({ seos: [{ id: 7 }, { title: 'new' }] }).success).toBe(true);
    // An id-less item missing its required scalar is rejected — it would be created empty.
    expect(schema.safeParse({ seos: [{ id: 7 }, {}] }).success).toBe(false);
  });

  it('update: component union rejects unknown keys on both branches', () => {
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(schema.safeParse({ seo: { id: 42, nope: 'x' } }).success).toBe(false);
    expect(schema.safeParse({ seo: { title: 't', nope: 'x' } }).success).toBe(false);
  });

  it('update: component union produces valid JSON Schema with both branches', () => {
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    const jsonSchema = z.toJSONSchema(schema, { io: 'input' }) as {
      properties?: Record<string, { description?: string; anyOf?: { required?: string[] }[] }>;
    };
    const seo = jsonSchema.properties?.seo;
    expect(seo?.anyOf).toHaveLength(2);
    // Patch branch requires id; create branch requires the component's required scalar.
    expect(seo?.anyOf?.[0]?.required).toContain('id');
    expect(seo?.anyOf?.[1]?.required).toContain('title');
    // The agent-facing explanation of the two branches is carried on the union.
    expect(seo?.description).toContain('Include "id" to update an existing component in place');
    expect(seo?.description).toContain('Omit "id" to replace it');
  });

  it('create: component is a single object with no id branch', () => {
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    const jsonSchema = z.toJSONSchema(schema, { io: 'input' }) as {
      properties?: Record<string, { anyOf?: unknown[]; properties?: Record<string, unknown> }>;
    };
    expect(jsonSchema.properties?.seo?.anyOf).toBeUndefined();
    // No id is accepted on create — the row does not exist yet.
    expect(schema.safeParse({ seo: { id: 42, title: 't' } }).success).toBe(false);
  });

  it('non-D&P create: required scalar inside a component stays hard-gated (guard)', () => {
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    // Component supplied but required scalar omitted → rejected.
    expect(schema.safeParse({ seo: {} }).success).toBe(false);
    expect(schema.safeParse({ seo: { title: 't' } }).success).toBe(true);
  });

  it('circular component reference falls back to z.record() — no infinite loop', () => {
    const attrs = { circular: { type: 'component', component: 'shared.circular' } } as TestAttrs;
    // Should not throw and should produce a parseable schema
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ circular: { name: 'root' } }).success).toBe(true);
  });

  it('unknown component UID falls back to z.record()', () => {
    const attrs = { mystery: { type: 'component', component: 'unknown.uid' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    // z.record(z.string(), z.unknown()) accepts any object
    expect(schema.safeParse({ mystery: { anything: 'goes' } }).success).toBe(true);
  });

  it('maps blocks attribute to a structured blocks array schema', () => {
    const attrs = { content: { type: 'blocks' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);

    // Valid paragraph block
    expect(
      schema.safeParse({
        content: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }],
      }).success
    ).toBe(true);

    // z.any() would accept this; the structured schema must reject it
    expect(schema.safeParse({ content: 'not-an-array' }).success).toBe(false);

    // Unknown block type rejected
    expect(schema.safeParse({ content: [{ type: 'unknown-block', children: [] }] }).success).toBe(
      false
    );
  });

  it('per-ct create tool uses derived data schema (non-D&P: required scalar gated)', () => {
    const model = baseModel({
      attributes: {
        title: { type: 'string', required: true },
        age: { type: 'integer' },
      } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const createTool = tools.find((t) => t.name === 'create_article')!;

    const inputSchema = createTool.resolveInputSchema(mockContext);
    expect(inputSchema.safeParse({ data: { title: 'Hi' } }).success).toBe(true);
    expect(inputSchema.safeParse({ data: {} }).success).toBe(false); // title required
    expect(inputSchema.safeParse({ data: { title: 'Hi', age: 'old' } }).success).toBe(false); // age must be int
  });

  it('Layer B: D&P create tool accepts empty data (draft leniency)', () => {
    const model = baseModel({
      options: { draftAndPublish: true },
      attributes: {
        title: { type: 'string', required: true },
        author: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::author.author',
          required: true,
        },
      } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const createTool = tools.find((t) => t.name === 'create_article')!;
    const inputSchema = createTool.resolveInputSchema(mockContext);
    expect(inputSchema.safeParse({ data: {} }).success).toBe(true);
  });

  it('Layer B: update tool accepts empty/partial data for D&P and non-D&P models', () => {
    for (const dp of [true, false]) {
      const model = baseModel({
        options: { draftAndPublish: dp },
        attributes: { title: { type: 'string', required: true } } as TestAttrs,
      });
      const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
      const updateTool = tools.find((t) => t.name === 'update_article')!;
      const inputSchema = updateTool.resolveInputSchema(mockContext);
      expect(inputSchema.safeParse({ documentId: 'abc', data: {} }).success).toBe(true);
      expect(inputSchema.safeParse({ documentId: 'abc', data: { title: 'Hi' } }).success).toBe(
        true
      );
    }
  });

  it('Layer B: single-type write tool accepts empty/partial data', () => {
    const uid = 'api::global.global';
    const model = baseModel({
      kind: 'singleType',
      uid,
      apiID: 'global',
      options: { draftAndPublish: true },
      attributes: { title: { type: 'string', required: true } } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const writeTool = tools.find((t) => t.name === 'write_global')!;
    const inputSchema = writeTool.resolveInputSchema(mockContext);
    expect(inputSchema.safeParse({ data: {} }).success).toBe(true);
  });

  // The collection update handler creates a new locale (and the single-type write upserts)
  // when no version exists. On a non-D&P model that create is published, so a required field
  // is enforced late — by the entity validator, not at this Zod boundary. The input schema is
  // resolved per-tool before the request, so it cannot tell an update from a locale-create /
  // first-write; it stays partial and the server remains the source of truth for the create
  // path. These tests pin that intentional late-validation contract.
  it('Layer B: non-D&P update tool accepts empty data (locale-create validated late server-side)', () => {
    const model = baseModel({
      options: { draftAndPublish: false },
      attributes: { title: { type: 'string', required: true } } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const updateTool = tools.find((t) => t.name === 'update_article')!;
    const inputSchema = updateTool.resolveInputSchema(mockContext);
    // Passes Zod; the published locale-create path enforces `title` in the entity validator.
    expect(inputSchema.safeParse({ documentId: 'abc', data: {} }).success).toBe(true);
    // Required field still advertised via the (lifecycle-neutral) hint, not the required array.
    const jsonSchema = z.toJSONSchema(inputSchema) as {
      properties?: {
        data?: { required?: string[]; properties?: Record<string, { description?: string }> };
      };
    };
    const data = jsonSchema.properties?.data;
    expect(data?.required ?? []).not.toContain('title');
    expect(data?.properties?.title?.description).toContain('when the entry is saved');
  });

  it('Layer B: non-D&P single-type write accepts empty data (first-write validated late server-side)', () => {
    const model = baseModel({
      kind: 'singleType',
      uid: 'api::global.global',
      apiID: 'global',
      options: { draftAndPublish: false },
      attributes: { title: { type: 'string', required: true } } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const writeTool = tools.find((t) => t.name === 'write_global')!;
    const inputSchema = writeTool.resolveInputSchema(mockContext);
    // Passes Zod; the published first-write (upsert create) enforces `title` server-side.
    expect(inputSchema.safeParse({ data: {} }).success).toBe(true);
    const jsonSchema = z.toJSONSchema(inputSchema) as {
      properties?: {
        data?: { required?: string[]; properties?: Record<string, { description?: string }> };
      };
    };
    const data = jsonSchema.properties?.data;
    expect(data?.required ?? []).not.toContain('title');
    expect(data?.properties?.title?.description).toContain('when the entry is saved');
  });

  it('D&P create: relaxed fields drop out of the JSON Schema required array + hint present', () => {
    const attrs = {
      title: { type: 'string', required: true },
      subtitle: { type: 'string', required: false },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs);
    const jsonSchema = z.toJSONSchema(schema) as {
      required?: string[];
      properties?: Record<string, { description?: string }>;
    };
    // title is no longer advertised as required to the agent
    expect(jsonSchema.required ?? []).not.toContain('title');
    // required-hint text is emitted for the required attribute
    expect(jsonSchema.properties?.title?.description).toContain('before publishing');
  });

  it('non-D&P create: required scalar still listed in JSON Schema required array (guard)', () => {
    const attrs = { title: { type: 'string', required: true } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    const jsonSchema = z.toJSONSchema(schema) as { required?: string[] };
    expect(jsonSchema.required ?? []).toContain('title');
  });

  it('partial update: required scalar is optional but keeps the required hint (D&P + non-D&P)', () => {
    // The hint wording is mode-aware: a D&P update targets a draft (publish step), a non-D&P
    // update is published immediately (enforced on save).
    const cases = [
      { make: makeDpModel, hint: 'before publishing' },
      { make: makeModel, hint: 'when the entry is saved' },
    ] as const;
    for (const { make, hint } of cases) {
      const attrs = {
        title: { type: 'string', required: true },
        subtitle: { type: 'string', required: false },
      } as TestAttrs;
      const schema = buildDataSchema(mockStrapi, make(attrs), attrs, null, {
        operation: 'update',
      });
      const jsonSchema = z.toJSONSchema(schema) as {
        required?: string[];
        properties?: Record<string, { description?: string }>;
      };
      // Nothing is hard-gated on a partial update
      expect(jsonSchema.required ?? []).toEqual([]);
      // ...but the required field is still distinguishable via the mode-aware hint
      expect(jsonSchema.properties?.title?.description).toContain(hint);
      // and the optional field carries no hint
      expect(jsonSchema.properties?.subtitle?.description ?? '').not.toContain('Marked required');
    }
  });

  it('update_* / write_* tools advertise required fields via the hint, not the required array', () => {
    const collection = baseModel({
      options: { draftAndPublish: true },
      attributes: { title: { type: 'string', required: true } } as TestAttrs,
    });
    const single = baseModel({
      kind: 'singleType',
      uid: 'api::global.global',
      apiID: 'global',
      options: { draftAndPublish: true },
      attributes: { title: { type: 'string', required: true } } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [collection, single]);

    for (const name of ['update_article', 'write_global']) {
      const tool = tools.find((t) => t.name === name)!;
      const inputSchema = tool.resolveInputSchema(mockContext);
      const jsonSchema = z.toJSONSchema(inputSchema) as {
        properties?: {
          data?: { required?: string[]; properties?: Record<string, { description?: string }> };
        };
      };
      const data = jsonSchema.properties?.data;
      expect(data?.required ?? []).not.toContain('title');
      expect(data?.properties?.title?.description).toContain('before publishing');
    }
  });

  it('required Blocks field composes its own description with the hint (no clobber)', () => {
    const attrs = { body: { type: 'blocks', required: true } } as TestAttrs;
    // D&P create relaxes the required Blocks field to optional-with-hint
    const dpSchema = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs);
    const dpJson = z.toJSONSchema(dpSchema) as {
      properties?: Record<string, { description?: string }>;
    };
    const dpDescription = dpJson.properties?.body?.description ?? '';
    // Blocks' own description is preserved...
    expect(dpDescription).toContain('structured rich text content');
    // ...alongside the required hint
    expect(dpDescription).toContain('before publishing');

    // Same on a partial update — here on a non-D&P model, so the hint uses neutral wording
    const partialSchema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    const partialJson = z.toJSONSchema(partialSchema) as {
      properties?: Record<string, { description?: string }>;
    };
    const partialDescription = partialJson.properties?.body?.description ?? '';
    expect(partialDescription).toContain('structured rich text content');
    expect(partialDescription).toContain('when the entry is saved');
  });

  it('update: repeatable component and dynamic zone arrays carry the wholesale-replace hint', () => {
    // The Document Service replaces these lists wholesale on update — existing rows not
    // resent are deleted. The schema cannot enforce this, so the description must warn.
    const attrs = {
      links: { type: 'component', component: 'shared.seo', repeatable: true },
      sections: { type: 'dynamiczone', components: ['shared.seo'] },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    const jsonSchema = z.toJSONSchema(schema) as {
      properties?: Record<string, { description?: string }>;
    };
    for (const key of ['links', 'sections']) {
      const description = jsonSchema.properties?.[key]?.description ?? '';
      expect(description).toContain('permanently deleted');
      expect(description).toContain('Omit this field entirely');
    }
  });

  it('create: repeatable component and dynamic zone arrays carry no wholesale-replace hint', () => {
    // On create there is no existing list to truncate — the warning would be noise.
    const attrs = {
      links: { type: 'component', component: 'shared.seo', repeatable: true },
      sections: { type: 'dynamiczone', components: ['shared.seo'] },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    const jsonSchema = z.toJSONSchema(schema) as {
      properties?: Record<string, { description?: string }>;
    };
    for (const key of ['links', 'sections']) {
      expect(jsonSchema.properties?.[key]?.description ?? '').not.toContain('permanently deleted');
    }
  });

  it('update: non-repeatable component carries no wholesale-replace hint', () => {
    // A single component is not a list — nothing to truncate.
    const attrs = { seo: { type: 'component', component: 'shared.seo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    const jsonSchema = z.toJSONSchema(schema) as {
      properties?: Record<string, { description?: string }>;
    };
    expect(jsonSchema.properties?.seo?.description ?? '').not.toContain('permanently deleted');
  });

  it('update: required repeatable component composes wholesale hint with the required hint', () => {
    const attrs = {
      links: { type: 'component', component: 'shared.seo', repeatable: true, required: true },
    } as TestAttrs;
    // Non-D&P update: required is relaxed (partial) with neutral wording; both hints compose.
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    const jsonSchema = z.toJSONSchema(schema) as {
      properties?: Record<string, { description?: string }>;
    };
    const description = jsonSchema.properties?.links?.description ?? '';
    expect(description).toContain('permanently deleted');
    expect(description).toContain('when the entry is saved');
  });

  it('D&P create: strict mode still rejects unknown keys after relaxation', () => {
    const attrs = { title: { type: 'string', required: true } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs);
    expect(schema.safeParse({ unknownField: 'x' }).success).toBe(false);
  });

  it('excludes attributes not in permittedFields set', () => {
    const attrs = {
      title: { type: 'string' },
      body: { type: 'text' },
    } as TestAttrs;
    const permitted = new Set(['title']);
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, permitted);
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
    expect(schema.safeParse({ title: 'hello', body: 'text' }).success).toBe(false);
  });

  it('excludes private attributes (private: true) from the data schema', () => {
    const attrs = {
      title: { type: 'string' },
      secret: { type: 'string', private: true },
      password: { type: 'password', private: true },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
    expect(schema.safeParse({ title: 'hello', secret: 'value' }).success).toBe(false);
    expect(schema.safeParse({ title: 'hello', password: 'pass' }).success).toBe(false);
  });

  it('includes component attr when CASL rules have nested paths (regular admin)', () => {
    // Regular admin: CASL rules store 'SEO.title', 'SEO.description', 'SEO.url' — NOT flat 'SEO'
    const ability = makeFieldRestrictedAbility([
      'title',
      'SEO.title',
      'SEO.description',
      'SEO.url',
    ]);
    const context = { userAbility: ability, user: mockUser };
    const attrs = {
      title: { type: 'string' },
      SEO: { type: 'component', component: 'shared.seo' },
    } as TestAttrs;
    const model = baseModel({ uid: 'api::article.article', attributes: attrs });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const createTool = tools.find((t) => t.name === 'create_article')!;

    const inputSchema = createTool.resolveInputSchema(context);
    // Both title and SEO must appear in the data schema
    expect(
      inputSchema.safeParse({
        data: { title: 'Hi', SEO: { title: 't', description: 'd', url: 'u' } },
      }).success
    ).toBe(true);
    expect(inputSchema.safeParse({ data: { title: 'Hi' } }).success).toBe(true);
  });

  it('excludes component attr when CASL rules have NO nested paths for it', () => {
    // Only 'title' is permitted — no SEO.* paths → SEO must be absent from schema
    const attrs = {
      title: { type: 'string' },
      SEO: { type: 'component', component: 'shared.seo' },
    } as TestAttrs;
    const permitted = new Set(['title']); // simulates getPermittedFields result
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, permitted);
    // title is present, SEO is excluded
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
    expect(schema.safeParse({ title: 'hello', SEO: {} }).success).toBe(false);
  });

  it('includes dynamiczone attr when it passes flat CASL key check', () => {
    const ability = makeFieldRestrictedAbility(['content']);
    const context = { userAbility: ability, user: mockUser };
    const attrs = {
      content: { type: 'dynamiczone', components: [] },
    } as TestAttrs;
    const model = baseModel({ uid: 'api::article.article', attributes: attrs });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const createTool = tools.find((t) => t.name === 'create_article')!;

    const inputSchema = createTool.resolveInputSchema(context);
    expect(inputSchema.safeParse({ data: { content: [] } }).success).toBe(true);
  });
});
