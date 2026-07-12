/**
 * Unit tests for shape-relations.ts
 *
 * Tests reduceToIdentity / isManyRelationForMcp (pure) and shapeRelationsForMcp through the
 * REAL traverseEntity engine — only `strapi.getModel` is stubbed. Mocking the traversal would
 * mean mocking the logic under test (it has hidden contracts: recursion into relation targets,
 * components, dynamic zones), so it is intentionally not mocked here.
 */
import {
  reduceToIdentity,
  isManyRelationForMcp,
  MANY_RELATION_TYPES,
  shapeRelationsForMcp,
} from '../shape-relations';

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

  // ── status preservation (calculate, then strip) ─────────────────────────

  it('preserves a string status on entries (computed localization status)', () => {
    const attr = { relation: 'oneToMany' };
    const value = [
      { documentId: 'loc1', locale: 'fr', status: 'modified', publishedAt: '2024-01-01' },
      { documentId: 'loc2', locale: 'it', status: 'draft', publishedAt: null },
    ];
    expect(reduceToIdentity(attr, value)).toEqual([
      { documentId: 'loc1', locale: 'fr', status: 'modified' },
      { documentId: 'loc2', locale: 'it', status: 'draft' },
    ]);
  });

  it('ignores a non-string status', () => {
    const attr = { relation: 'oneToOne' };
    expect(reduceToIdentity(attr, { documentId: 'a', status: 42 })).toEqual({ documentId: 'a' });
  });

  // ── cardinality predicate ────────────────────────────────────────────────

  it('isManyRelationForMcp covers expected relation kinds', () => {
    for (const kind of ['oneToMany', 'manyToMany', 'manyWay', 'morphToMany', 'morphMany']) {
      expect(isManyRelationForMcp({ relation: kind })).toBe(true);
      expect(MANY_RELATION_TYPES.has(kind)).toBe(true);
    }
  });

  it('isManyRelationForMcp rejects to-one kinds', () => {
    for (const kind of ['oneToOne', 'manyToOne', 'oneWay', 'morphToOne', 'morphOne']) {
      expect(isManyRelationForMcp({ relation: kind })).toBe(false);
      expect(MANY_RELATION_TYPES.has(kind)).toBe(false);
    }
  });

  it('isManyRelationForMcp handles a missing relation kind', () => {
    expect(isManyRelationForMcp({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shapeRelationsForMcp — real traverseEntity, stubbed strapi.getModel
// ---------------------------------------------------------------------------

describe('shapeRelationsForMcp (real traverseEntity)', () => {
  const useModels = (models: Record<string, unknown>) => {
    (global as Record<string, unknown>).strapi = {
      getModel: (uid: string) => models[uid],
    } as unknown as typeof strapi;
  };

  const makeArticleModel = (attributes: Record<string, unknown>) => ({
    'api::test.test': { uid: 'api::test.test', attributes },
  });

  it('reduces a to-one relation to identity', async () => {
    useModels(
      makeArticleModel({
        category: { type: 'relation', relation: 'manyToOne', target: 'api::category.category' },
      })
    );

    const result = await shapeRelationsForMcp('api::test.test' as never, {
      title: 'Article',
      category: { documentId: 'cat1', locale: 'en', secretField: 'LEAKED' },
    });

    expect(result.category).toEqual({ documentId: 'cat1', locale: 'en' });
  });

  it('reduces a to-many relation to identity array', async () => {
    useModels(
      makeArticleModel({
        tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
      })
    );

    const result = await shapeRelationsForMcp('api::test.test' as never, {
      tags: [{ documentId: 't1', label: 'LEAKED' }, { documentId: 't2' }],
    });

    expect(result.tags).toEqual([{ documentId: 't1' }, { documentId: 't2' }]);
  });

  it('manyWay relation returns an identity ARRAY (matches the registered output schema)', async () => {
    useModels(
      makeArticleModel({
        tags: { type: 'relation', relation: 'manyWay', target: 'api::tag.tag' },
      })
    );

    const result = await shapeRelationsForMcp('api::test.test' as never, {
      tags: [{ documentId: 't1', label: 'LEAKED' }],
    });

    expect(Array.isArray(result.tags)).toBe(true);
    expect(result.tags).toEqual([{ documentId: 't1' }]);
  });

  it('leaves admin::user relations untouched', async () => {
    const createdBy = { id: 1, email: 'admin@example.com', firstname: 'Admin' };
    useModels(
      makeArticleModel({
        createdBy: { type: 'relation', relation: 'manyToOne', target: 'admin::user' },
      })
    );

    const result = await shapeRelationsForMcp('api::test.test' as never, { createdBy });

    // admin::user skipped — full record preserved
    expect(result.createdBy).toEqual(createdBy);
  });

  it('reduces localizations to identity array and PRESERVES the computed status', async () => {
    useModels(
      makeArticleModel({
        localizations: { type: 'relation', relation: 'oneToMany', target: 'api::test.test' },
      })
    );

    // formatDocumentWithMetadata runs BEFORE shaping and stamps `status` on each
    // localization entry — shaping must keep it while stripping everything else.
    const result = await shapeRelationsForMcp('api::test.test' as never, {
      title: 'Hello',
      localizations: [
        {
          documentId: 'loc1',
          locale: 'fr',
          status: 'modified',
          publishedAt: '2024-01-01',
          updatedAt: '2024-02-01',
          title: 'Bonjour',
          somePrivateField: 'LEAKED',
        },
      ],
    });

    expect(result.localizations).toEqual([
      { documentId: 'loc1', locale: 'fr', status: 'modified' },
    ]);
  });

  it('leaves non-relation attributes untouched', async () => {
    useModels(
      makeArticleModel({
        title: { type: 'string' },
        content: { type: 'richtext' },
      })
    );

    const result = await shapeRelationsForMcp('api::test.test' as never, {
      title: 'My Article',
      content: 'Some content',
    });

    expect(result.title).toBe('My Article');
    expect(result.content).toBe('Some content');
  });

  it('normalizes a {count} to-many to []', async () => {
    useModels(
      makeArticleModel({
        tags: { type: 'relation', relation: 'oneToMany', target: 'api::tag.tag' },
      })
    );

    const result = await shapeRelationsForMcp('api::test.test' as never, {
      tags: { count: 3 },
    });

    expect(result.tags).toEqual([]);
  });

  it('morphToOne: __type survives shaping and other fields are stripped', async () => {
    useModels(
      makeArticleModel({
        related: { type: 'relation', relation: 'morphToOne' },
      })
    );

    const result = await shapeRelationsForMcp('api::test.test' as never, {
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
  });

  it('morphToMany: returns an identity ARRAY with __type on each entry', async () => {
    useModels(
      makeArticleModel({
        items: { type: 'relation', relation: 'morphToMany' },
      })
    );

    const result = await shapeRelationsForMcp('api::test.test' as never, {
      items: [
        { documentId: 'a', __type: 'api::article.article', secretField: 'LEAKED' },
        { documentId: 'b', __type: 'api::tag.tag' },
      ],
    });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toEqual([
      { documentId: 'a', __type: 'api::article.article' },
      { documentId: 'b', __type: 'api::tag.tag' },
    ]);
  });

  it('morphMany: returns an identity ARRAY (matches the registered output schema)', async () => {
    useModels(
      makeArticleModel({
        boxes: {
          type: 'relation',
          relation: 'morphMany',
          target: 'api::box.box',
          morphBy: 'related',
        },
      })
    );

    const result = await shapeRelationsForMcp('api::test.test' as never, {
      boxes: [{ documentId: 'b1', __type: 'api::box.box', secretField: 'LEAKED' }],
    });

    expect(Array.isArray(result.boxes)).toBe(true);
    expect(result.boxes).toEqual([{ documentId: 'b1', __type: 'api::box.box' }]);
  });

  it('relation inside a component: nested relation fields are reduced to identity', async () => {
    useModels({
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
    });

    const result = await shapeRelationsForMcp('api::article.article' as never, {
      seo: {
        author: { documentId: 'auth1', name: 'LEAKED', email: 'LEAKED' },
        title: 'My Title',
      },
    });

    expect((result.seo as Record<string, unknown>).author).toEqual({ documentId: 'auth1' });
    expect((result.seo as Record<string, unknown>).title).toBe('My Title');
  });

  it('relation inside a dynamic zone entry is reduced to identity', async () => {
    useModels({
      'api::article.article': {
        uid: 'api::article.article',
        attributes: {
          blocks: { type: 'dynamiczone', components: ['shared.quote'] },
        },
      },
      'shared.quote': {
        uid: 'shared.quote',
        attributes: {
          author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
          text: { type: 'string' },
        },
      },
    });

    const result = await shapeRelationsForMcp('api::article.article' as never, {
      blocks: [
        {
          __component: 'shared.quote',
          author: { documentId: 'auth1', email: 'LEAKED' },
          text: 'Some quote',
        },
      ],
    });

    const [block] = result.blocks as Array<Record<string, unknown>>;
    expect(block.author).toEqual({ documentId: 'auth1' });
    expect(block.text).toBe('Some quote');
  });
});

// ---------------------------------------------------------------------------
// shapeRelationsForMcp — opt-in relation inlining (RBAC-safe, one level deep)
// ---------------------------------------------------------------------------

describe('shapeRelationsForMcp with opt-in inlining', () => {
  const useModels = (models: Record<string, unknown>) => {
    (global as Record<string, unknown>).strapi = {
      getModel: (uid: string) => models[uid],
    } as unknown as typeof strapi;
  };

  const models = {
    'api::page.page': {
      uid: 'api::page.page',
      attributes: {
        title: { type: 'string' },
        header: { type: 'relation', relation: 'oneToOne', target: 'api::header.header' },
        buttons: { type: 'relation', relation: 'oneToMany', target: 'api::button.button' },
      },
    },
    'api::header.header': {
      uid: 'api::header.header',
      attributes: {
        label: { type: 'string' },
        // The header itself points back to a logo relation — must be stubbed (one level deep).
        logo: { type: 'relation', relation: 'oneToOne', target: 'api::media.media' },
      },
    },
    'api::button.button': {
      uid: 'api::button.button',
      attributes: { text: { type: 'string' } },
    },
    'api::media.media': { uid: 'api::media.media', attributes: { url: { type: 'string' } } },
  };

  // Resolver that "sanitizes" by dropping a pretend non-readable field, mirroring a
  // target permissionChecker.sanitizeOutput. Relations on the entry are left for the
  // outer traversal to stub.
  const inlineRelation = jest.fn(async (_targetUid: string, entry: Record<string, unknown>) => {
    const { secret, ...rest } = entry;
    return rest;
  });

  beforeEach(() => jest.clearAllMocks());

  it('inlines a named to-one relation while stubbing its own sub-relations', async () => {
    useModels(models);

    const result = await shapeRelationsForMcp(
      'api::page.page' as never,
      {
        title: 'Home',
        header: {
          documentId: 'h1',
          label: 'Welcome',
          secret: 'DO NOT LEAK',
          logo: { documentId: 'm1', url: 'LEAKED-media-url' },
        },
      },
      { inlineRelationKeys: new Set(['header']), inlineRelation }
    );

    const header = result.header as Record<string, unknown>;
    // Inlined fields present, non-readable field stripped by the resolver
    expect(header.label).toBe('Welcome');
    expect(header.secret).toBeUndefined();
    // The inlined entry's OWN relation is reduced to an identity stub (one level deep)
    expect(header.logo).toEqual({ documentId: 'm1' });
  });

  it('inlines a named to-many relation as an array of sanitized entries', async () => {
    useModels(models);

    const result = await shapeRelationsForMcp(
      'api::page.page' as never,
      {
        buttons: [
          { documentId: 'b1', text: 'Go', secret: 'x' },
          { documentId: 'b2', text: 'Stop', secret: 'y' },
        ],
      },
      { inlineRelationKeys: new Set(['buttons']), inlineRelation }
    );

    expect(result.buttons).toEqual([
      { documentId: 'b1', text: 'Go' },
      { documentId: 'b2', text: 'Stop' },
    ]);
  });

  it('leaves relations NOT named in inlineRelationKeys as identity stubs', async () => {
    useModels(models);

    const result = await shapeRelationsForMcp(
      'api::page.page' as never,
      {
        header: { documentId: 'h1', label: 'Welcome', secret: 'x' },
        buttons: [{ documentId: 'b1', text: 'Go' }],
      },
      { inlineRelationKeys: new Set(['header']), inlineRelation }
    );

    // header inlined, buttons stubbed
    expect((result.header as Record<string, unknown>).label).toBe('Welcome');
    expect(result.buttons).toEqual([{ documentId: 'b1' }]);
  });

  it('falls back to an identity stub when the resolver returns null (target not readable)', async () => {
    useModels(models);
    const denyResolver = jest.fn(async () => null);

    const result = await shapeRelationsForMcp(
      'api::page.page' as never,
      { header: { documentId: 'h1', label: 'Welcome' } },
      { inlineRelationKeys: new Set(['header']), inlineRelation: denyResolver }
    );

    expect(result.header).toEqual({ documentId: 'h1' });
  });

  it('to-one named relation with null value stays null (no resolver call)', async () => {
    useModels(models);

    const result = await shapeRelationsForMcp(
      'api::page.page' as never,
      { header: null },
      { inlineRelationKeys: new Set(['header']), inlineRelation }
    );

    expect(result.header).toBeNull();
    expect(inlineRelation).not.toHaveBeenCalled();
  });

  it('with no options behaves exactly like the default stub shaping', async () => {
    useModels(models);

    const result = await shapeRelationsForMcp('api::page.page' as never, {
      header: { documentId: 'h1', label: 'Welcome', secret: 'x' },
    });

    expect(result.header).toEqual({ documentId: 'h1' });
  });
});

// ---------------------------------------------------------------------------
// shapeRelationsForMcp — opt-in relation inlining (RBAC-safe)
// ---------------------------------------------------------------------------

describe('shapeRelationsForMcp — opt-in inlining', () => {
  const useModels = (models: Record<string, unknown>) => {
    (global as Record<string, unknown>).strapi = {
      getModel: (uid: string) => models[uid],
    } as unknown as typeof strapi;
  };

  it('inlines a top-level relation opted into inlining, sanitized via the resolver', async () => {
    useModels({
      'api::article.article': {
        uid: 'api::article.article',
        attributes: {
          author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
        },
      },
      'api::author.author': { uid: 'api::author.author', attributes: { name: { type: 'string' } } },
    });

    // Resolver simulates the related type's permissionChecker: strips a non-readable field.
    const inlineRelation = jest.fn(async (_uid: string, entry: Record<string, unknown>) => {
      const { email, ...rest } = entry;
      return rest;
    });

    const result = await shapeRelationsForMcp(
      'api::article.article' as never,
      { author: { documentId: 'auth1', name: 'Ada', email: 'SECRET' } },
      { inlineRelationKeys: new Set(['author']), inlineRelation }
    );

    expect(inlineRelation).toHaveBeenCalledWith('api::author.author', expect.any(Object));
    expect(result.author).toEqual({ documentId: 'auth1', name: 'Ada' });
  });

  it('falls back to an identity stub when the resolver returns null (not readable)', async () => {
    useModels({
      'api::article.article': {
        uid: 'api::article.article',
        attributes: {
          author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
        },
      },
      'api::author.author': { uid: 'api::author.author', attributes: { name: { type: 'string' } } },
    });

    const inlineRelation = jest.fn(async () => null);

    const result = await shapeRelationsForMcp(
      'api::article.article' as never,
      { author: { documentId: 'auth1', name: 'Ada', email: 'SECRET' } },
      { inlineRelationKeys: new Set(['author']), inlineRelation }
    );

    expect(result.author).toEqual({ documentId: 'auth1' });
  });

  it('inlines a to-many relation and stubs the inlined entries own relations (one level)', async () => {
    useModels({
      'api::article.article': {
        uid: 'api::article.article',
        attributes: {
          tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
        },
      },
      'api::tag.tag': {
        uid: 'api::tag.tag',
        attributes: {
          label: { type: 'string' },
          owner: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
        },
      },
      'api::author.author': { uid: 'api::author.author', attributes: {} },
    });

    // Resolver returns the entry as-is; the OUTER traversal must stub the entry's `owner`.
    const inlineRelation = jest.fn(async (_uid: string, entry: Record<string, unknown>) => entry);

    const result = await shapeRelationsForMcp(
      'api::article.article' as never,
      {
        tags: [
          { documentId: 'tag1', label: 'A', owner: { documentId: 'auth1', name: 'LEAK' } },
          { documentId: 'tag2', label: 'B', owner: null },
        ],
      },
      { inlineRelationKeys: new Set(['tags']), inlineRelation }
    );

    expect(result.tags).toEqual([
      { documentId: 'tag1', label: 'A', owner: { documentId: 'auth1' } },
      { documentId: 'tag2', label: 'B', owner: null },
    ]);
  });

  it('does NOT inline relations that were not opted in', async () => {
    useModels({
      'api::article.article': {
        uid: 'api::article.article',
        attributes: {
          author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
          editor: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
        },
      },
      'api::author.author': { uid: 'api::author.author', attributes: { name: { type: 'string' } } },
    });

    const inlineRelation = jest.fn(async (_uid: string, entry: Record<string, unknown>) => entry);

    const result = await shapeRelationsForMcp(
      'api::article.article' as never,
      {
        author: { documentId: 'auth1', name: 'Ada' },
        editor: { documentId: 'auth2', name: 'Grace' },
      },
      { inlineRelationKeys: new Set(['author']), inlineRelation }
    );

    expect(result.author).toEqual({ documentId: 'auth1', name: 'Ada' });
    expect(result.editor).toEqual({ documentId: 'auth2' });
  });

  it('does NOT inline a relation nested inside a component (top-level only)', async () => {
    useModels({
      'api::article.article': {
        uid: 'api::article.article',
        attributes: { seo: { type: 'component', component: 'shared.seo' } },
      },
      'shared.seo': {
        uid: 'shared.seo',
        attributes: {
          author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
        },
      },
      'api::author.author': { uid: 'api::author.author', attributes: { name: { type: 'string' } } },
    });

    const inlineRelation = jest.fn(async (_uid: string, entry: Record<string, unknown>) => entry);

    const result = await shapeRelationsForMcp(
      'api::article.article' as never,
      { seo: { author: { documentId: 'auth1', name: 'LEAK' } } },
      // Even though "author" is in the set, it is not a TOP-LEVEL attribute here.
      { inlineRelationKeys: new Set(['author']), inlineRelation }
    );

    expect(inlineRelation).not.toHaveBeenCalled();
    expect((result.seo as Record<string, unknown>).author).toEqual({ documentId: 'auth1' });
  });
});
