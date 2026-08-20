import * as z from 'zod';

import { SCHEMA_REGISTRY_GLOBAL_KEY, schemaRegistry } from '../src/utils/schema-registry';
import { OPENAPI_SCHEMA_CONVERSION_OPTIONS, toComponentsPath } from '../src/utils/zod';

describe('schemaRegistry', () => {
  beforeEach(() => {
    schemaRegistry.clear();
  });

  afterEach(() => {
    schemaRegistry.clear();
  });

  it('sets, gets, finds, and enumerates schemas by ID', () => {
    const schema = z.string();

    schemaRegistry.set('Article', schema);

    expect(schemaRegistry.has('Article')).toBe(true);
    expect(schemaRegistry.get('Article')).toBe(schema);
    expect([...schemaRegistry.entries()]).toEqual([['Article', schema]]);
    expect(schemaRegistry.getRegistry().has(schema)).toBe(true);
  });

  it('replaces an existing schema in both indexes', () => {
    const placeholder = z.any();
    const schema = z.object({ title: z.string() });

    schemaRegistry.set('Article', placeholder);
    schemaRegistry.set('Article', schema);

    expect(schemaRegistry.get('Article')).toBe(schema);
    expect(schemaRegistry.getRegistry().has(placeholder)).toBe(false);
    expect(schemaRegistry.getRegistry().has(schema)).toBe(true);
  });

  it('removes schemas from both indexes', () => {
    const schema = z.string();
    schemaRegistry.set('Article', schema);

    expect(schemaRegistry.remove('Article')).toBe(true);
    expect(schemaRegistry.remove('Article')).toBe(false);
    expect(schemaRegistry.has('Article')).toBe(false);
    expect(schemaRegistry.getRegistry().has(schema)).toBe(false);
  });

  it('clears all schemas from both indexes', () => {
    const article = z.string();
    const category = z.number();
    schemaRegistry.set('Article', article);
    schemaRegistry.set('Category', category);

    schemaRegistry.clear();

    expect([...schemaRegistry.entries()]).toEqual([]);
    expect(schemaRegistry.getRegistry().has(article)).toBe(false);
    expect(schemaRegistry.getRegistry().has(category)).toBe(false);
  });

  it('stores schemas on globalThis so CJS and ESM copies share one registry', () => {
    const schema = z.string();
    schemaRegistry.set('Article', schema);

    const store = (
      globalThis as typeof globalThis & {
        [SCHEMA_REGISTRY_GLOBAL_KEY]?: {
          schemas: Map<string, z.ZodType>;
        };
      }
    )[SCHEMA_REGISTRY_GLOBAL_KEY];

    expect(store?.schemas.get('Article')).toBe(schema);
  });

  it('defers in-progress lookups so JSON Schema keeps component $refs', () => {
    schemaRegistry.startPending('Article');
    schemaRegistry.set('Article', z.any());

    const articleRef = schemaRegistry.getOrDefer('Article');
    if (articleRef === undefined) {
      throw new Error('expected a deferred Article schema');
    }

    schemaRegistry.set(
      'Article',
      z.object({
        title: z.string(),
        related: z.array(articleRef),
      })
    );
    schemaRegistry.finishPending('Article');

    const { schemas } = z.toJSONSchema(schemaRegistry.getRegistry(), {
      ...OPENAPI_SCHEMA_CONVERSION_OPTIONS,
      uri: toComponentsPath,
    });

    expect(schemas.Article).toMatchObject({
      properties: {
        related: {
          type: 'array',
          items: { $ref: '#/components/schemas/Article' },
        },
      },
    });
  });

  it('converts the replacement schema instead of a stale cyclical placeholder', () => {
    schemaRegistry.set('Article', z.any());
    schemaRegistry.set('Article', z.object({ title: z.string() }));

    const { schemas } = z.toJSONSchema(schemaRegistry.getRegistry(), {
      ...OPENAPI_SCHEMA_CONVERSION_OPTIONS,
      uri: toComponentsPath,
    });

    expect(schemas.Article).toMatchObject({
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
      additionalProperties: false,
    });
  });
});
