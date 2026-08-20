import * as z from 'zod';

import { createContentAPISchemaRegistry } from '../schema-registry';

const toJsonSchemas = (schemaStore: ReturnType<typeof createContentAPISchemaRegistry>) => {
  const registry = z.registry<{ id: string }>();

  for (const [id, schema] of schemaStore.entries()) {
    registry.add(schema, { id });
  }

  return z.toJSONSchema(registry, {
    target: 'draft-2020-12',
    io: 'output',
    uri: (id: string) => `#/components/schemas/${id}`,
  }).schemas;
};

describe('createContentAPISchemaRegistry', () => {
  it('sets, gets, finds, and enumerates schemas by ID', () => {
    const schemaStore = createContentAPISchemaRegistry();
    const schema = z.string();

    schemaStore.set('Article', schema);

    expect(schemaStore.has('Article')).toBe(true);
    expect(schemaStore.get('Article')).toBe(schema);
    expect([...schemaStore.entries()]).toEqual([['Article', schema]]);
  });

  it('replaces an existing schema in the ID map', () => {
    const schemaStore = createContentAPISchemaRegistry();
    const placeholder = z.any();
    const schema = z.object({ title: z.string() });

    schemaStore.set('Article', placeholder);
    schemaStore.set('Article', schema);

    expect(schemaStore.get('Article')).toBe(schema);
  });

  it('removes schemas from this instance only', () => {
    const schemaStore = createContentAPISchemaRegistry();
    const schema = z.string();
    schemaStore.set('Article', schema);

    expect(schemaStore.remove('Article')).toBe(true);
    expect(schemaStore.remove('Article')).toBe(false);
    expect(schemaStore.has('Article')).toBe(false);
  });

  it('clears this instance without affecting another factory instance', () => {
    const schemaStore = createContentAPISchemaRegistry();
    const otherStore = createContentAPISchemaRegistry();
    const article = z.string();
    const category = z.number();

    schemaStore.set('Article', article);
    otherStore.set('Category', category);

    schemaStore.clear();

    expect([...schemaStore.entries()]).toEqual([]);
    expect(otherStore.get('Category')).toBe(category);
  });

  it('does not share state across factory instances or globalThis', () => {
    const schemaStore = createContentAPISchemaRegistry();
    const otherStore = createContentAPISchemaRegistry();
    const schema = z.string();

    schemaStore.set('Article', schema);

    expect(otherStore.has('Article')).toBe(false);
    expect(
      (globalThis as typeof globalThis & { __strapi_openapiSchemaRegistry?: unknown })
        .__strapi_openapiSchemaRegistry
    ).toBeUndefined();
  });

  it('defers in-progress lookups so JSON Schema keeps component $refs', () => {
    const schemaStore = createContentAPISchemaRegistry();

    schemaStore.startPending('Article');
    schemaStore.set('Article', z.any());

    const articleRef = schemaStore.getOrDefer('Article');
    if (articleRef === undefined) {
      throw new Error('expected a deferred Article schema');
    }

    schemaStore.set(
      'Article',
      z.object({
        title: z.string(),
        related: z.array(articleRef),
      })
    );
    schemaStore.finishPending('Article');

    expect(toJsonSchemas(schemaStore).Article).toMatchObject({
      properties: {
        related: {
          type: 'array',
          items: { $ref: '#/components/schemas/Article' },
        },
      },
    });
  });

  it('converts the replacement schema instead of a stale cyclical placeholder', () => {
    const schemaStore = createContentAPISchemaRegistry();

    schemaStore.set('Article', z.any());
    schemaStore.set('Article', z.object({ title: z.string() }));

    expect(toJsonSchemas(schemaStore).Article).toMatchObject({
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
      additionalProperties: false,
    });
  });
});
