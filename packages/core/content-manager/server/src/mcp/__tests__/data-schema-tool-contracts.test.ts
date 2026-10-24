import { z } from '@strapi/utils';

import {
  deriveDisplayedContentTypeMcpToolDefinitions,
  buildDataSchema,
} from '../derive-content-type-mcp-tools';
import {
  mockStrapi,
  mockContext,
  baseModel,
  makeModel,
  makeDpModel,
  type TestAttrs,
} from '../test-fixtures';

// ---------------------------------------------------------------------------
// `data` input-schema derivation — the contract advertised to MCP clients.
//
// What the derived tools actually expose: which fields land in the JSON Schema
// `required` array under each operation/draftAndPublish combination, and the
// required / wholesale-replace hints carried in descriptions. The schema
// construction behind these lives in the sibling `data-schema-*.test.ts` files.
// ---------------------------------------------------------------------------

describe('buildDataSchema | advertised tool contract and hints', () => {
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

  it('D&P create and update tools accept null for draft-relaxed required fields', () => {
    const model = baseModel({
      options: { draftAndPublish: true },
      attributes: {
        title: { type: 'string', required: true },
        seo: {
          type: 'component',
          component: 'shared.seo',
          required: true,
        },
      } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const createTool = tools.find((t) => t.name === 'create_article')!;
    const updateTool = tools.find((t) => t.name === 'update_article')!;

    expect(
      createTool.resolveInputSchema(mockContext).safeParse({
        data: { title: null, seo: null },
      }).success
    ).toBe(true);
    expect(
      updateTool.resolveInputSchema(mockContext).safeParse({
        documentId: 'abc',
        data: { title: null, seo: null },
      }).success
    ).toBe(true);
  });

  it('non-D&P partial update keeps required fields non-nullable', () => {
    const model = baseModel({
      options: { draftAndPublish: false },
      attributes: {
        title: { type: 'string', required: true },
        seo: {
          type: 'component',
          component: 'shared.seo',
          required: true,
        },
      } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const updateTool = tools.find((t) => t.name === 'update_article')!;
    const inputSchema = updateTool.resolveInputSchema(mockContext);

    expect(inputSchema.safeParse({ documentId: 'abc', data: {} }).success).toBe(true);
    expect(inputSchema.safeParse({ documentId: 'abc', data: { title: null } }).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: 'abc', data: { seo: null } }).success).toBe(false);
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
});
