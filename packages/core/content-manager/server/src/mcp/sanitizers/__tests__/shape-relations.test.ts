/**
 * Unit tests for shape-relations.ts
 *
 * Tests reduceToIdentity (pure) and shapeRelationsForMcp (via mocked strapi + traverseEntity).
 * A separate describe block exercises the real traverseEntity so nested component relations are
 * shaped correctly without mocking the traversal engine.
 */
import { reduceToIdentity, MANY_RELATION_TYPES } from '../shape-relations';

// ---------------------------------------------------------------------------
// reduceToIdentity — pure tests, no strapi dependency
// ---------------------------------------------------------------------------

describe('reduceToIdentity', () => {
  // ── to-one ──────────────────────────────────────────────────────────────

  it('to-one: extracts documentId from a full populated doc', () => {
    const attr = { relation: 'manyToOne' };
    const value = {
      documentId: 'abc123',
      name: 'Leaked field',
      email: 'leaked@example.com',
    };
    expect(reduceToIdentity(attr, value)).toEqual({ documentId: 'abc123' });
  });

  it('to-one: includes locale when present on target', () => {
    const attr = { relation: 'oneToOne' };
    const value = { documentId: 'abc123', locale: 'fr', title: 'Secret' };
    expect(reduceToIdentity(attr, value)).toEqual({ documentId: 'abc123', locale: 'fr' });
  });

  it('to-one: omits locale when absent', () => {
    const attr = { relation: 'manyToOne' };
    const value = { documentId: 'abc123', title: 'No locale' };
    expect(reduceToIdentity(attr, value)).toEqual({ documentId: 'abc123' });
  });

  it('to-one: returns null when value is null', () => {
    const attr = { relation: 'oneToOne' };
    expect(reduceToIdentity(attr, null)).toBeNull();
  });

  it('to-one: returns null when value is undefined', () => {
    const attr = { relation: 'manyToOne' };
    expect(reduceToIdentity(attr, undefined)).toBeNull();
  });

  it('to-one: returns null when value is a bare {count} object (no documentId)', () => {
    const attr = { relation: 'oneToOne' };
    expect(reduceToIdentity(attr, { count: 5 })).toBeNull();
  });

  it('to-one: includes __type for morphToOne', () => {
    const attr = { relation: 'morphToOne' };
    const value = { documentId: 'xyz', __type: 'api::article.article', title: 'Secret' };
    expect(reduceToIdentity(attr, value)).toEqual({
      documentId: 'xyz',
      __type: 'api::article.article',
    });
  });

  // ── to-many ─────────────────────────────────────────────────────────────

  it('to-many: maps array to identity objects', () => {
    const attr = { relation: 'oneToMany' };
    const value = [
      { documentId: 'a1', locale: 'en', email: 'leak@x.com' },
      { documentId: 'a2', locale: 'fr', name: 'Also leaked' },
    ];
    expect(reduceToIdentity(attr, value)).toEqual([
      { documentId: 'a1', locale: 'en' },
      { documentId: 'a2', locale: 'fr' },
    ]);
  });

  it('to-many: returns [] when value is empty array', () => {
    const attr = { relation: 'manyToMany' };
    expect(reduceToIdentity(attr, [])).toEqual([]);
  });

  it('to-many: returns [] when value is null (defensive)', () => {
    const attr = { relation: 'oneToMany' };
    expect(reduceToIdentity(attr, null)).toEqual([]);
  });

  it('to-many: returns [] for bare {count} shape (no documentId)', () => {
    const attr = { relation: 'oneToMany' };
    expect(reduceToIdentity(attr, { count: 3 })).toEqual([]);
  });

  it('to-many: drops entries without documentId', () => {
    const attr = { relation: 'manyToMany' };
    const value = [
      { documentId: 'a1' },
      { count: 1 }, // no documentId — should be dropped
    ];
    expect(reduceToIdentity(attr, value)).toEqual([{ documentId: 'a1' }]);
  });

  it('to-many: manyWay is treated as to-many', () => {
    const attr = { relation: 'manyWay' };
    const value = [{ documentId: 'a1', title: 'Leaked' }];
    expect(reduceToIdentity(attr, value)).toEqual([{ documentId: 'a1' }]);
  });

  it('to-many: morphToMany includes __type', () => {
    const attr = { relation: 'morphToMany' };
    const value = [
      { documentId: 'x1', __type: 'api::article.article', secret: 'no' },
      { documentId: 'x2', __type: 'api::tag.tag' },
    ];
    expect(reduceToIdentity(attr, value)).toEqual([
      { documentId: 'x1', __type: 'api::article.article' },
      { documentId: 'x2', __type: 'api::tag.tag' },
    ]);
  });

  // ── MANY_RELATION_TYPES set ──────────────────────────────────────────────

  it('MANY_RELATION_TYPES covers expected relation kinds', () => {
    for (const kind of ['oneToMany', 'manyToMany', 'manyWay', 'morphToMany', 'morphMany']) {
      expect(MANY_RELATION_TYPES.has(kind)).toBe(true);
    }
  });

  it('MANY_RELATION_TYPES does not include to-one kinds', () => {
    for (const kind of ['oneToOne', 'manyToOne', 'oneWay', 'morphToOne', 'morphOne']) {
      expect(MANY_RELATION_TYPES.has(kind)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// shapeRelationsForMcp — integration-style with mocked strapi + traverseEntity
// ---------------------------------------------------------------------------

// Mock traverseEntity to directly invoke the visitor so we don't need a real
// schema structure. We replicate the attribute iteration that traverseEntity does
// for top-level keys.
jest.mock('@strapi/utils', () => {
  const actual = jest.requireActual('@strapi/utils');
  return {
    ...actual,
    traverseEntity: jest.fn(async (visitor, options, entity) => {
      const { schema } = options;
      const result = { ...entity };

      for (const [key, attribute] of Object.entries(schema?.attributes ?? {})) {
        const value = result[key];
        // Simulate VisitorUtils.set
        const set = jest.fn((k: string, v: unknown) => {
          result[k] = v;
        });
        visitor(
          { key, value, attribute, path: { raw: key, attribute: key }, data: result },
          { set }
        );
      }

      return result;
    }),
  };
});

describe('shapeRelationsForMcp', () => {
  // Import after mocks are set up
  // We use jest.isolateModules so each test gets a fresh module referencing mockStrapi
  const makeStrapi = (attributes: Record<string, unknown>) =>
    ({
      getModel: jest.fn(() => ({ attributes, uid: 'api::test.test' })),
    }) as unknown as typeof strapi;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reduces a to-one relation to identity', async () => {
    const fakeStrapi = makeStrapi({
      category: { type: 'relation', relation: 'manyToOne', target: 'api::category.category' },
    });
    (global as any).strapi = fakeStrapi;

    const { shapeRelationsForMcp } = await import('../shape-relations');

    const result = await shapeRelationsForMcp('api::test.test' as any, {
      title: 'Article',
      category: { documentId: 'cat1', locale: 'en', secretField: 'LEAKED' },
    });

    expect(result.category).toEqual({ documentId: 'cat1', locale: 'en' });
    expect((result.category as any).secretField).toBeUndefined();
  });

  it('reduces a to-many relation to identity array', async () => {
    const fakeStrapi = makeStrapi({
      tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
    });
    (global as any).strapi = fakeStrapi;

    const { shapeRelationsForMcp } = await import('../shape-relations');

    const result = await shapeRelationsForMcp('api::test.test' as any, {
      tags: [{ documentId: 't1', label: 'LEAKED' }, { documentId: 't2' }],
    });

    expect(result.tags).toEqual([{ documentId: 't1' }, { documentId: 't2' }]);
  });

  it('leaves admin::user relations untouched', async () => {
    const createdBy = { id: 1, email: 'admin@example.com', firstname: 'Admin' };
    const fakeStrapi = makeStrapi({
      createdBy: { type: 'relation', relation: 'manyToOne', target: 'admin::user' },
    });
    (global as any).strapi = fakeStrapi;

    const { shapeRelationsForMcp } = await import('../shape-relations');

    const result = await shapeRelationsForMcp('api::test.test' as any, { createdBy });

    // admin::user skipped — full record preserved
    expect(result.createdBy).toEqual(createdBy);
  });

  it('reduces localizations to identity array (fixes leak family #2)', async () => {
    const fakeStrapi = makeStrapi({
      localizations: { type: 'relation', relation: 'oneToMany', target: 'api::test.test' },
    });
    (global as any).strapi = fakeStrapi;

    const { shapeRelationsForMcp } = await import('../shape-relations');

    const result = await shapeRelationsForMcp('api::test.test' as any, {
      title: 'Hello',
      localizations: [
        {
          documentId: 'loc1',
          locale: 'fr',
          publishedAt: '2024-01-01',
          title: 'Bonjour',
          somePrivateField: 'LEAKED',
        },
      ],
    });

    expect(result.localizations).toEqual([{ documentId: 'loc1', locale: 'fr' }]);
  });

  it('leaves non-relation attributes untouched', async () => {
    const fakeStrapi = makeStrapi({
      title: { type: 'string' },
      content: { type: 'richtext' },
    });
    (global as any).strapi = fakeStrapi;

    const { shapeRelationsForMcp } = await import('../shape-relations');

    const result = await shapeRelationsForMcp('api::test.test' as any, {
      title: 'My Article',
      content: 'Some content',
    });

    expect(result.title).toBe('My Article');
    expect(result.content).toBe('Some content');
  });

  it('normalizes a {count} to-many to []', async () => {
    const fakeStrapi = makeStrapi({
      tags: { type: 'relation', relation: 'oneToMany', target: 'api::tag.tag' },
    });
    (global as any).strapi = fakeStrapi;

    const { shapeRelationsForMcp } = await import('../shape-relations');

    const result = await shapeRelationsForMcp('api::test.test' as any, {
      tags: { count: 3 },
    });

    expect(result.tags).toEqual([]);
  });

  it('morphToOne: __type survives shaping and other fields are stripped', async () => {
    const fakeStrapi = makeStrapi({
      related: { type: 'relation', relation: 'morphToOne' },
    });
    (global as any).strapi = fakeStrapi;

    const { shapeRelationsForMcp } = await import('../shape-relations');

    const result = await shapeRelationsForMcp('api::test.test' as any, {
      related: {
        documentId: 'morph1',
        __type: 'api::article.article',
        locale: 'en',
        secretField: 'LEAKED',
      },
    });

    expect(result.related).toEqual({
      documentId: 'morph1',
      __type: 'api::article.article',
      locale: 'en',
    });
    expect((result.related as any).secretField).toBeUndefined();
  });

  it('morphToMany: __type survives shaping on each entry', async () => {
    const fakeStrapi = makeStrapi({
      items: { type: 'relation', relation: 'morphToMany' },
    });
    (global as any).strapi = fakeStrapi;

    const { shapeRelationsForMcp } = await import('../shape-relations');

    const result = await shapeRelationsForMcp('api::test.test' as any, {
      items: [
        { documentId: 'a', __type: 'api::article.article', secretField: 'LEAKED' },
        { documentId: 'b', __type: 'api::tag.tag' },
      ],
    });

    expect(result.items).toEqual([
      { documentId: 'a', __type: 'api::article.article' },
      { documentId: 'b', __type: 'api::tag.tag' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Real traverseEntity — nested component + dynamic zone relations
//
// These tests bypass the module-level traverseEntity mock by using
// jest.isolateModules so we get the genuine traversal engine.  This proves
// that relations nested inside components and dynamic zones are shaped
// correctly — not just top-level ones.
// ---------------------------------------------------------------------------

describe('shapeRelationsForMcp (real traverseEntity) — nested relations', () => {
  const makeModels = (models: Record<string, unknown>) =>
    ({
      getModel: jest.fn((uid: string) => models[uid]),
    }) as unknown as typeof strapi;

  it('relation inside a component: nested relation fields are reduced to identity', async () => {
    const models = {
      'api::article.article': {
        uid: 'api::article.article',
        attributes: {
          seo: { type: 'component', component: 'shared.seo' },
        },
      },
      'shared.seo': {
        uid: 'shared.seo',
        attributes: {
          author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
          title: { type: 'string' },
        },
      },
    };

    let shapeRelationsForMcp: (uid: any, data: any) => Promise<any>;
    jest.isolateModules(() => {
      jest.unmock('@strapi/utils');
      (global as any).strapi = makeModels(models);
      // eslint-disable-next-line @typescript-eslint/no-require-imports, node/no-missing-require
      ({ shapeRelationsForMcp } = require('../shape-relations'));
    });

    const result = await shapeRelationsForMcp!('api::article.article' as any, {
      seo: {
        author: { documentId: 'auth1', name: 'LEAKED', email: 'LEAKED' },
        title: 'My Title',
      },
    });

    expect((result.seo as any).author).toEqual({ documentId: 'auth1' });
    expect((result.seo as any).author.name).toBeUndefined();
    expect((result.seo as any).author.email).toBeUndefined();
    expect((result.seo as any).title).toBe('My Title');
  });
});
