import { z } from '@strapi/utils';

import { buildDataSchema } from '../derive-content-type-mcp-tools';
import { mockStrapi, makeModel, makeDpModel, type TestAttrs } from '../test-fixtures';

// ---------------------------------------------------------------------------
// `data` input-schema derivation — components and dynamic zones.
//
// The id-patch / id-less-create union that mirrors the server's
// `updateOrCreateComponent` dispatch, the `__component`-discriminated dynamic-zone
// union, component id validation, and recursion/cycle fallbacks. The hints and
// JSON Schema these produce at tool level live in
// `data-schema-tool-contracts.test.ts`; scalars in `data-schema-scalars.test.ts`;
// relations and media in `data-schema-relations.test.ts`.
// ---------------------------------------------------------------------------

describe('buildDataSchema | components and dynamic zones', () => {
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
      properties?: {
        seo?: {
          anyOf?: {
            type?: string;
            properties?: { title?: { anyOf?: { type?: string }[] } };
          }[];
        };
      };
    };
    // Optional attributes are nullable (the server accepts a clear on any non-required field),
    // so both the component and its leaves are an `anyOf` of the real shape and `null`. The
    // object branch must still carry the component's attributes — the regression guarded here
    // is an *empty* properties map, which the nullable wrapper must not reintroduce.
    const seo = jsonSchema.properties?.seo;
    expect(seo?.anyOf).toContainEqual({ type: 'null' });
    const objectBranch = seo?.anyOf?.find((b) => b.properties !== undefined);
    expect(objectBranch?.properties?.title?.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
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
      properties?: Record<
        string,
        {
          description?: string;
          anyOf?: { type?: string; required?: string[]; anyOf?: { required?: string[] }[] }[];
        }
      >;
    };
    const seo = jsonSchema.properties?.seo;
    // Nullability nests rather than flattens: the property is `[<patch|create union>, null]`,
    // with the patch/create union preserved intact as the first branch. The `null` branch comes
    // from this component not being required — the server accepts a clear on any such field.
    expect(seo?.anyOf).toHaveLength(2);
    expect(seo?.anyOf?.[1]).toEqual({ type: 'null' });
    const union = seo?.anyOf?.[0]?.anyOf;
    expect(union).toHaveLength(2);
    // Patch branch requires id; create branch requires the component's required scalar.
    expect(union?.[0]?.required).toContain('id');
    expect(union?.[1]?.required).toContain('title');
    // The agent-facing explanation of the two branches survives the nullable wrapper.
    expect(seo?.description).toContain('Include "id" to update an existing component in place');
    expect(seo?.description).toContain('Omit "id" to replace it');
  });

  it('create: component has no id branch (only the object and null shapes)', () => {
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    const jsonSchema = z.toJSONSchema(schema, { io: 'input' }) as {
      properties?: Record<
        string,
        { anyOf?: { type?: string; required?: string[] }[]; properties?: Record<string, unknown> }
      >;
    };
    // Create has no patch/create split — just the object shape and the `null` clear, so there
    // is no `id`-bearing branch.
    const branches = jsonSchema.properties?.seo?.anyOf;
    expect(branches).toHaveLength(2);
    expect(branches?.[1]).toEqual({ type: 'null' });
    expect(branches?.[0]?.required).toContain('title');
    // No id is accepted on create — the row does not exist yet.
    expect(schema.safeParse({ seo: { id: 42, title: 't' } }).success).toBe(false);
  });

  it('draft writes accept an explicit null on a required non-repeatable component', () => {
    // Non-repeatable components follow the scalar projection: `createComponentValidator`'s
    // non-repeatable branch passes `required: !isDraft && attr.required`, which collapses to
    // `false` on a draft, so `addRequiredValidation` takes its `.nullable()` else-branch and
    // `{ seo: null }` is accepted server-side. `.optional()` alone would reject it, and on an
    // update `null` is the only way to clear the component — omission keeps the current row.
    const attrs = {
      seo: { type: 'component', component: 'shared.reqseo', required: true },
    } as TestAttrs;

    for (const operation of ['create', 'update'] as const) {
      const schema = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs, null, { operation });
      expect(schema.safeParse({ seo: null }).success).toBe(true);
      // Omission still works, and a real object is still validated as before.
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ seo: { title: 't' } }).success).toBe(true);
      expect(schema.safeParse({ seo: 'not-an-object' }).success).toBe(false);
    }
  });

  it('non-required non-repeatable components accept null in every mode', () => {
    const attrs = { seo: { type: 'component', component: 'shared.seo' } } as TestAttrs;

    for (const model of [makeModel(attrs), makeDpModel(attrs)]) {
      for (const operation of ['create', 'update'] as const) {
        const schema = buildDataSchema(mockStrapi, model, attrs, null, { operation });
        expect(schema.safeParse({ seo: null }).success).toBe(true);
      }
    }
  });

  it('published writes reject an explicit null on a required non-repeatable component', () => {
    // A non-D&P write is published, so `addRequiredValidation` keeps the real `required: true`
    // and the object schema is never made nullable — the server rejects `{ seo: null }` with
    // "seo must be an `object` type". The update relaxation covers omission only.
    const attrs = {
      seo: { type: 'component', component: 'shared.reqseo', required: true },
    } as TestAttrs;

    const create = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(create.safeParse({ seo: null }).success).toBe(false);

    const update = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    expect(update.safeParse({}).success).toBe(true);
    expect(update.safeParse({ seo: null }).success).toBe(false);
  });

  it('non-D&P create: required scalar inside a component stays hard-gated (guard)', () => {
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    // Component supplied but required scalar omitted → rejected.
    expect(schema.safeParse({ seo: {} }).success).toBe(false);
    expect(schema.safeParse({ seo: { title: 't' } }).success).toBe(true);
  });

  it('component id rejects malformed identities (not bare coercion)', () => {
    // `z.coerce.number()` turned null/false/'' into 0 and true into 1, so a malformed id
    // silently became "patch some row" instead of failing. A row id is a positive integer.
    const attrs = { seo: { type: 'component', component: 'shared.reqseo' } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });
    const patch = (id: unknown) => schema.safeParse({ seo: { id } }).success;

    // Accepted: positive integers, and digit strings from JSON clients.
    expect(patch(42)).toBe(true);
    expect(patch('42')).toBe(true);

    // Rejected: each of these previously coerced to a usable number. They fall through to
    // the create branch, which then rejects them for missing the required `title`.
    expect(patch(null)).toBe(false);
    expect(patch(false)).toBe(false);
    expect(patch(true)).toBe(false);
    expect(patch('')).toBe(false);
    expect(patch(0)).toBe(false);
    expect(patch(-1)).toBe(false);
    expect(patch(1.5)).toBe(false);
    expect(patch('1.5')).toBe(false);
    expect(patch('abc')).toBe(false);
  });

  it('dynamic zone entries are discriminated on __component', () => {
    const attrs = {
      sections: { type: 'dynamiczone', components: ['shared.hero', 'shared.seo'] },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);

    // A known component with its required leaf supplied.
    expect(
      schema.safeParse({ sections: [{ __component: 'shared.hero', title: 'Hi' }] }).success
    ).toBe(true);

    // `z.any()` accepted all of these; the discriminated union must not.
    expect(schema.safeParse({ sections: [{ title: 'Hi' }] }).success).toBe(false);
    expect(
      schema.safeParse({ sections: [{ __component: 'shared.notinzone', title: 'Hi' }] }).success
    ).toBe(false);
    // Fields belonging to the *other* branch are rejected on this one (strict per branch).
    expect(
      schema.safeParse({ sections: [{ __component: 'shared.hero', url: '/foo' }] }).success
    ).toBe(false);
  });

  it('non-D&P create: dynamic-zone entry cannot omit its required leaf', () => {
    // The published-create hazard: an entry missing `title` used to pass as `z.any()`, then
    // persist a live component with `title = null`.
    const attrs = {
      sections: { type: 'dynamiczone', components: ['shared.hero'] },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);

    expect(
      schema.safeParse({ sections: [{ __component: 'shared.hero', subtitle: 'new' }] }).success
    ).toBe(false);
    expect(
      schema.safeParse({ sections: [{ __component: 'shared.hero', title: 'Hi', subtitle: 'new' }] })
        .success
    ).toBe(true);
  });

  it('update: id-less dynamic-zone entry is validated as a create, id-bearing one as a patch', () => {
    // Same dispatch as ordinary components: `id` patches the row, no `id` creates a
    // replacement and deletes the old one — so only the id-less branch enforces required.
    const attrs = {
      sections: { type: 'dynamiczone', components: ['shared.hero'] },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs, null, {
      operation: 'update',
    });

    // Patch: `title` may be omitted, the existing row keeps it.
    expect(schema.safeParse({ sections: [{ __component: 'shared.hero', id: 7 }] }).success).toBe(
      true
    );
    // Replacement: the new row is created from these fields alone, so `title` is required.
    expect(
      schema.safeParse({ sections: [{ __component: 'shared.hero', subtitle: 'new' }] }).success
    ).toBe(false);
    expect(
      schema.safeParse({ sections: [{ __component: 'shared.hero', title: 'Hi' }] }).success
    ).toBe(true);
    // A single array can mix both branches.
    expect(
      schema.safeParse({
        sections: [
          { __component: 'shared.hero', id: 7 },
          { __component: 'shared.hero', title: 'Hi' },
        ],
      }).success
    ).toBe(true);
  });

  it('D&P update: id-less dynamic-zone replacement stays lenient (draft target)', () => {
    const attrs = {
      sections: { type: 'dynamiczone', components: ['shared.hero'] },
    } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeDpModel(attrs), attrs, null, {
      operation: 'update',
    });
    // Drafts skip required validation, so the create branch relaxes here too — but the
    // discriminator is still mandatory.
    expect(
      schema.safeParse({ sections: [{ __component: 'shared.hero', subtitle: 'new' }] }).success
    ).toBe(true);
    expect(schema.safeParse({ sections: [{ subtitle: 'new' }] }).success).toBe(false);
  });

  it('dynamic zone with no declared components stays permissive', () => {
    // Nothing to discriminate on — fall back rather than rejecting every entry.
    const attrs = { sections: { type: 'dynamiczone', components: [] } } as TestAttrs;
    const schema = buildDataSchema(mockStrapi, makeModel(attrs), attrs);
    expect(schema.safeParse({ sections: [] }).success).toBe(true);
    expect(schema.safeParse({ sections: [{ anything: 'goes' }] }).success).toBe(true);
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
});
