import { z } from '@strapi/utils';

import {
  deriveDisplayedContentTypeMcpToolDefinitions,
  buildDataSchema,
} from '../derive-content-type-mcp-tools';
import {
  mockStrapi,
  mockUser,
  baseModel,
  makeModel,
  makeDpModel,
  makeFieldRestrictedAbility,
  type TestAttrs,
} from '../test-fixtures';

// ---------------------------------------------------------------------------
// `data` input-schema derivation — scalar attributes.
//
// Attribute-to-Zod mapping for scalars, the required/min projection by operation
// and draftAndPublish, and the permission filtering applied to the resulting
// shape. Relations and media live in `data-schema-relations.test.ts`; components
// and dynamic zones in `data-schema-components.test.ts`. Shared model builders
// come from `../test-fixtures`.
// ---------------------------------------------------------------------------

describe('buildDataSchema | scalars, required/min projection, permissions', () => {
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

    // Dynamic-zone entries are discriminated on `__component`, so a valid entry carries it.
    const section = { __component: 'shared.seo' };

    // D&P create targets a draft → below-minimum (including empty) accepted.
    const dpCreate = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs);
    expect(dpCreate.safeParse({ links: [], sections: [] }).success).toBe(true);
    // ...but the maximum still applies (it is not draft-exempt).
    expect(dpCreate.safeParse({ links: [{}, {}, {}, {}] }).success).toBe(false);
    expect(dpCreate.safeParse({ sections: [section, section, section, section] }).success).toBe(
      false
    );

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
    const section = { __component: 'shared.seo' };
    expect(create.safeParse({ links: [{}, {}], sections: [section, section] }).success).toBe(true);

    // A non-D&P update is published too, so the bound stays.
    const update = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(update.safeParse({ links: [] }).success).toBe(false);
    expect(update.safeParse({ sections: [] }).success).toBe(false);
  });

  it('required aggregates keep their key on create even on a D&P draft', () => {
    // Aggregates are the one carve-out from draft leniency. `createComponentValidator`
    // (repeatable branch) and `createDzValidator` both pass a hard-coded `required: true`
    // to `addRequiredValidation`, ignoring `isDraft`, and `addDefault` only substitutes `[]`
    // for aggregates that are *not* required. So on creation the key is `notNil()` with no
    // default and omitting it throws "<field> must be defined" — draft or not. Relaxing it
    // here would advertise a write the server rejects.
    //
    // This test covers the schema projection only; the server-side behaviour it mirrors is
    // pinned by "aggregates are not draft-exempt" in
    // packages/core/core/src/services/entity-validator/__tests__/index.test.ts.
    const attrs = {
      title: { type: 'string', required: true },
      links: { type: 'component', component: 'shared.seo', repeatable: true, required: true },
      sections: { type: 'dynamiczone', components: ['shared.seo'], required: true },
    } as TestAttrs;
    const section = { __component: 'shared.seo' };

    const dpCreate = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs);
    // The required *scalar* is relaxed on a draft…
    expect(dpCreate.safeParse({ links: [], sections: [] }).success).toBe(true);
    // …but the aggregate keys are not: each must be present.
    expect(dpCreate.safeParse({ sections: [] }).success).toBe(false);
    expect(dpCreate.safeParse({ links: [] }).success).toBe(false);
    expect(dpCreate.safeParse({}).success).toBe(false);
    // Present-but-empty satisfies it — the server wants the key, not the contents.
    expect(dpCreate.safeParse({ links: [{}], sections: [section] }).success).toBe(true);

    // Non-D&P create is stricter still, and the aggregate rule is the same.
    const create = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(create.safeParse({ title: 't' }).success).toBe(false);
    expect(create.safeParse({ title: 't', links: [], sections: [] }).success).toBe(true);
  });

  it('required aggregates relax on update (absent key is accepted server-side)', () => {
    // On update `addRequiredValidation` uses `notNull()` rather than `notNil()`, so an
    // absent key genuinely is accepted — the partial-update relaxation is safe here.
    //
    // Schema projection only; the server-side branch this depends on is pinned by "Accepts
    // omitted required repeatable component and dynamic zone on update" in
    // packages/core/core/src/services/entity-validator/__tests__/index.test.ts, which also
    // covers explicit `null` still being rejected.
    const attrs = {
      links: { type: 'component', component: 'shared.seo', repeatable: true, required: true },
      sections: { type: 'dynamiczone', components: ['shared.seo'], required: true },
    } as TestAttrs;

    for (const model of [makeModel(attrs), makeDpModel(attrs)]) {
      const update = buildDataSchema(mockStrapi, model, attrs, null, { operation: 'update' });
      expect(update.safeParse({}).success).toBe(true);
      // Relaxed, but still advertised as required via the hint.
      const jsonSchema = z.toJSONSchema(update, { io: 'input' }) as {
        required?: string[];
        properties?: Record<string, { description?: string }>;
      };
      expect(jsonSchema.required ?? []).not.toContain('links');
      expect(jsonSchema.properties?.links?.description).toContain('Marked required');
      expect(jsonSchema.properties?.sections?.description).toContain('Marked required');
    }
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
