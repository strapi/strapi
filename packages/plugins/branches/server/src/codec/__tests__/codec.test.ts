import {
  applyRelationInput,
  diffSnapshots,
  fromDocument,
  mergeChangeSets,
  normalizePopulate,
  splitChangesByLocale,
  threeWayMerge,
  toSnapshot,
  type RelRef,
} from '..';

const schemas: Record<string, any> = {
  'api::article.article': {
    uid: 'api::article.article',
    modelType: 'contentType',
    kind: 'collectionType',
    options: { draftAndPublish: true },
    pluginOptions: { i18n: { localized: true } },
    attributes: {
      title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
      views: { type: 'integer' },
      cover: { type: 'media', multiple: false },
      gallery: { type: 'media', multiple: true },
      author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
      tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
      blocks: { type: 'component', component: 'default.block', repeatable: true },
      seo: { type: 'component', component: 'default.seo', repeatable: false },
      zone: { type: 'dynamiczone', components: ['default.block'] },
      password: { type: 'password' },
      locale: { type: 'string', visible: false, private: false },
      localizations: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::article.article',
        visible: false,
      },
      createdBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user', visible: false },
      branch: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'plugin::branches.branch',
        useJoinTable: false,
        visible: false,
      },
    },
  },
  'api::author.author': {
    uid: 'api::author.author',
    modelType: 'contentType',
    options: { draftAndPublish: true },
    attributes: { name: { type: 'string' } },
  },
  'api::tag.tag': {
    uid: 'api::tag.tag',
    modelType: 'contentType',
    options: { draftAndPublish: false },
    pluginOptions: { i18n: { localized: true } },
    attributes: { name: { type: 'string' } },
  },
  'default.block': {
    uid: 'default.block',
    modelType: 'component',
    attributes: {
      text: { type: 'string' },
      image: { type: 'media', multiple: false },
      related: { type: 'relation', relation: 'oneToOne', target: 'api::author.author' },
    },
  },
  'default.seo': {
    uid: 'default.seo',
    modelType: 'component',
    attributes: { description: { type: 'text' } },
  },
};

const findManyMock = jest.fn(async () => []);

beforeEach(() => {
  findManyMock.mockReset();
  (global as any).strapi = {
    getModel: (uid: string) => schemas[uid],
    db: { query: () => ({ findMany: findManyMock }) },
    // The unit setup maps `strapi.plugin(name)` onto `strapi.plugins[name]`
    // and `plugin.service(name)` onto `plugin.services[name]`.
    plugins: {
      i18n: {
        services: {
          'content-types': {
            isLocalizedContentType: (model: any) => model?.pluginOptions?.i18n?.localized === true,
            getNonLocalizedAttributes: () => ['views', 'cover', 'gallery', 'blocks', 'seo', 'zone'],
          },
        },
      },
    },
    requestContext: { get: () => undefined },
  };
});

describe('applyRelationInput', () => {
  const tags = schemas['api::article.article'].attributes.tags;
  const author = schemas['api::article.article'].attributes.author;

  test('set replaces the list, resolving the target locale from the source', async () => {
    const result = await applyRelationInput(
      tags,
      [{ documentId: 'a' }, 'b'],
      [{ documentId: 'z', locale: 'en' }],
      'en',
      true
    );
    expect(result).toEqual([
      { documentId: 'a', locale: 'en' },
      { documentId: 'b', locale: 'en' },
    ]);
  });

  test('connect honours positions and disconnect removes by documentId', async () => {
    const current = [
      { documentId: 'a', locale: 'en' },
      { documentId: 'b', locale: 'en' },
      { documentId: 'c', locale: 'en' },
    ];
    const result = await applyRelationInput(
      tags,
      {
        connect: [
          { documentId: 'x', position: { before: 'b' } },
          { documentId: 'y', position: { start: true } },
          { documentId: 'w', position: { after: 'x' } },
        ],
        disconnect: [{ documentId: 'c' }],
      },
      current,
      'en',
      true
    );
    expect((result as RelRef[]).map((ref) => ref.documentId)).toEqual(['y', 'a', 'x', 'w', 'b']);
  });

  test('a chained reversed connect list (the CM reorder payload) keeps display order', async () => {
    const result = await applyRelationInput(
      tags,
      {
        connect: [
          { documentId: 'c', position: { end: true } },
          { documentId: 'b', position: { before: 'c' } },
          { documentId: 'a', position: { before: 'b' } },
        ],
        disconnect: [],
      },
      [],
      'en',
      true
    );
    expect((result as RelRef[]).map((ref) => ref.documentId)).toEqual(['a', 'b', 'c']);
  });

  test('an unresolvable anchor degrades to append', async () => {
    const result = await applyRelationInput(
      tags,
      { connect: [{ documentId: 'x', position: { before: 'missing' } }] },
      [{ documentId: 'a', locale: 'en' }],
      'en',
      true
    );
    expect((result as RelRef[]).map((ref) => ref.documentId)).toEqual(['a', 'x']);
  });

  test('toOne keeps the last connected item and null clears it', async () => {
    const swapped = await applyRelationInput(
      author,
      { disconnect: [{ documentId: 'old' }], connect: [{ documentId: 'new' }] },
      { documentId: 'old', locale: null },
      'en',
      true
    );
    expect(swapped).toEqual({ documentId: 'new', locale: null });
    expect(await applyRelationInput(author, null, swapped, 'en', true)).toBeNull();
  });

  test('bare ids are resolved to documentIds through the database', async () => {
    findManyMock.mockResolvedValueOnce([{ id: 7, documentId: 'seven', locale: null }] as never);
    const result = await applyRelationInput(author, 7, null, 'en', true);
    expect(result).toEqual({ documentId: 'seven', locale: null });
  });
});

describe('toSnapshot', () => {
  test('normalises media, components and relations and skips excluded attributes', async () => {
    const snapshot = await toSnapshot(
      'api::article.article',
      {
        title: 'Hello',
        views: 3,
        cover: { id: 12, url: '/uploads/a.png' },
        gallery: [{ id: 1 }, 2, null],
        tags: { connect: [{ id: 1, documentId: 't1' }], disconnect: [] },
        blocks: [
          {
            id: 5,
            __temp_key__: 0,
            text: 'kept',
            image: { id: 9 },
            related: { connect: [], disconnect: [] },
          },
          { __temp_key__: 1, text: 'new', image: null },
        ],
        seo: null,
        zone: [{ __component: 'default.block', id: 8, text: 'z' }],
        password: '',
        updatedBy: 1,
        locale: 'en',
        localizations: [],
      },
      { tags: [], blocks: [{ id: 5, text: 'old', related: { documentId: 'auth', locale: null } }] },
      { locale: 'en' }
    );

    expect(snapshot).toEqual({
      title: 'Hello',
      views: 3,
      cover: { id: 12 },
      gallery: [{ id: 1 }, { id: 2 }],
      tags: [{ documentId: 't1', locale: 'en' }],
      blocks: [
        { id: 5, text: 'kept', image: { id: 9 }, related: { documentId: 'auth', locale: null } },
        { text: 'new', image: null },
      ],
      seo: null,
      zone: [{ __component: 'default.block', id: 8, text: 'z' }],
    });
  });

  test('refuses relation changes inside components', async () => {
    await expect(
      toSnapshot(
        'api::article.article',
        { blocks: [{ text: 'x', related: { connect: [{ documentId: 'a' }], disconnect: [] } }] },
        {},
        { locale: 'en' }
      )
    ).rejects.toThrow(/inside a component/);
  });

  test('cleared multiple media becomes an empty list', async () => {
    const snapshot = await toSnapshot(
      'api::article.article',
      { gallery: null },
      {},
      { locale: 'en' }
    );
    expect(snapshot).toEqual({ gallery: [] });
  });
});

describe('fromDocument', () => {
  test('reads a populated row into snapshot format, keeping component ids', () => {
    const snapshot = fromDocument('api::article.article', {
      id: 1,
      documentId: 'doc',
      title: 'T',
      views: null,
      cover: { id: 3 },
      gallery: [{ id: 4 }, { id: 5 }],
      author: { id: 1, documentId: 'a1', locale: null },
      tags: [{ id: 2, documentId: 't', locale: 'en' }],
      blocks: [{ id: 10, text: 'b', image: null, related: null }],
      zone: [],
      updatedAt: '2026-01-01',
      branch: null,
    });
    expect(snapshot).toEqual({
      title: 'T',
      views: null,
      cover: { id: 3 },
      gallery: [{ id: 4 }, { id: 5 }],
      author: { documentId: 'a1', locale: null },
      tags: [{ documentId: 't', locale: 'en' }],
      blocks: [{ id: 10, text: 'b', image: null, related: null }],
      zone: [],
    });
  });
});

describe('diffSnapshots / threeWayMerge / mergeChangeSets', () => {
  test('ignores component ids and dates format when comparing', () => {
    const current = { blocks: [{ id: 1, text: 'a' }], title: 'x', views: 1 };
    const next = { blocks: [{ text: 'a' }], title: 'x', views: 2 };
    expect(diffSnapshots('api::article.article', current, next)).toEqual(['views']);
  });

  test('three-way merge takes branch values, skips identical changes and reports conflicts', () => {
    const { merged, conflicts } = threeWayMerge(
      'api::article.article',
      { title: 'parent edit', views: 1, seo: { description: 'same' } },
      { title: 'base', views: 1, seo: { description: 'base' } },
      { title: 'branch edit', views: 5, seo: { id: 3, description: 'same' } }
    );
    expect(merged).toEqual({ views: 5 });
    expect(conflicts).toEqual([
      { attribute: 'title', base: 'base', parent: 'parent edit', branch: 'branch edit' },
    ]);
  });

  test('later change sets win per attribute', () => {
    expect(mergeChangeSets([{ a: 1, b: 1 }, null, { b: 2 }, undefined])).toEqual({ a: 1, b: 2 });
  });
});

describe('normalizePopulate', () => {
  const model = schemas['api::article.article'];

  test('understands every populate form', () => {
    expect(normalizePopulate(model, '*').all).toBe(true);
    expect([...normalizePopulate(model, 'author,blocks.image').entries.entries()]).toEqual([
      ['author', {}],
      ['blocks', { populate: ['image'] }],
    ]);
    const object = normalizePopulate(model, {
      author: { count: true },
      tags: { fields: ['name'], populate: '*' },
      zone: { on: { 'default.block': { populate: { image: true } } } },
    });
    expect(object.entries.get('author')).toEqual({ count: true });
    expect(object.entries.get('tags')).toEqual({ fields: ['name'], populate: '*' });
    expect(object.entries.get('zone')?.on?.['default.block']).toEqual({
      populate: { image: true },
    });
  });
});

describe('splitChangesByLocale', () => {
  test('splits localized and non-localized attributes', () => {
    expect(splitChangesByLocale('api::article.article', { title: 'a', views: 1 })).toEqual({
      localized: { title: 'a' },
      nonLocalized: { views: 1 },
    });
  });

  test('puts everything on the shared row without i18n', () => {
    (global as any).strapi.plugins = {};
    expect(splitChangesByLocale('api::article.article', { title: 'a', views: 1 })).toEqual({
      localized: {},
      nonLocalized: { title: 'a', views: 1 },
    });
  });
});
