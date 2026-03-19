import { createFillFromLocaleService } from '../fill-from-locale';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeUserAbility = (canRead = true) => ({
  can: jest.fn(() => canRead),
});

/** Build a mock strapi with sensible defaults and easy per-test overrides. */
const createMockStrapi = (overrides: Record<string, unknown> = {}) => {
  const documentsFindOne = jest.fn();
  const documentsFindFirst = jest.fn();
  const dbFindMany = jest.fn().mockResolvedValue([]);

  const mockStrapi = {
    getModel: jest.fn(),
    documents: jest.fn(() => ({
      findOne: documentsFindOne,
      findFirst: documentsFindFirst,
    })),
    db: {
      query: jest.fn(() => ({ findMany: dbFindMany })),
    },
    plugins: {
      'content-manager': {
        services: {
          'populate-builder': () => ({
            populateDeep: () => ({ build: () => Promise.resolve({}) }),
          }),
          'document-metadata': {
            getStatus: jest.fn((entry: { publishedAt: unknown }) =>
              entry.publishedAt ? 'published' : 'draft'
            ),
          },
          'content-types': {
            findConfiguration: jest.fn().mockResolvedValue({ settings: { mainField: 'name' } }),
          },
        },
      },
      i18n: {
        services: {
          'content-types': {
            isLocalizedContentType: jest.fn().mockReturnValue(false),
          },
        },
      },
    },
    ...overrides,
  };

  return { mockStrapi, documentsFindOne, documentsFindFirst, dbFindMany };
};

/** Create a service + set global.strapi in one call. */
const makeService = (overrides: Record<string, unknown> = {}) => {
  const mocks = createMockStrapi(overrides);
  global.strapi = mocks.mockStrapi as any;
  const service = createFillFromLocaleService({ strapi: mocks.mockStrapi as any });
  return { service, ...mocks };
};

const MODEL = 'api::article.article';
const TARGET_LOCALE = 'fr';

// ---------------------------------------------------------------------------
// fetchRawDocument
// ---------------------------------------------------------------------------

describe('fetchRawDocument', () => {
  const documentId = 'doc-123';
  const sourceLocale = 'en';

  test('returns null when document not found', async () => {
    const { service, documentsFindOne, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue({ uid: MODEL, attributes: {} });
    documentsFindOne.mockResolvedValue(null);

    const result = await service.fetchRawDocument(MODEL as any, sourceLocale, documentId);

    expect(result).toBeNull();
    expect(documentsFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ documentId, locale: sourceLocale })
    );
  });

  test('returns the raw document when found', async () => {
    const { service, documentsFindOne, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue({ uid: MODEL, attributes: {} });
    const doc = { title: 'Hello', documentId, locale: sourceLocale };
    documentsFindOne.mockResolvedValue(doc);

    const result = await service.fetchRawDocument(MODEL as any, sourceLocale, documentId);

    expect(result).toEqual(doc);
  });

  test('uses findFirst when documentId is omitted (single type)', async () => {
    const { service, documentsFindFirst, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue({ uid: MODEL, attributes: {} });
    const doc = { title: 'ST', locale: sourceLocale };
    documentsFindFirst.mockResolvedValue(doc);

    const result = await service.fetchRawDocument(MODEL as any, sourceLocale);

    expect(result).toEqual(doc);
    expect(documentsFindFirst).toHaveBeenCalled();
  });

  test('throws when model not found', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue(null);

    await expect(service.fetchRawDocument(MODEL as any, sourceLocale, documentId)).rejects.toThrow(
      `Model ${MODEL} not found`
    );
  });
});

// ---------------------------------------------------------------------------
// transformDocument — field filtering (processDocumentData)
// ---------------------------------------------------------------------------

describe('transformDocument — field filtering', () => {
  const FIELDS_TO_REMOVE = [
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    'id',
    'documentId',
    'publishedAt',
    'strapi_stage',
    'strapi_assignee',
    'locale',
    'status',
  ];

  test('strips all FIELDS_TO_REMOVE', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue({
      uid: MODEL,
      attributes: { title: { type: 'string' } },
    });

    const doc: Record<string, unknown> = { title: 'Hello' };
    FIELDS_TO_REMOVE.forEach((f) => {
      doc[f] = 'should-be-removed';
    });

    const result = await service.transformDocument(
      doc,
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result).toEqual({ title: 'Hello' });
    FIELDS_TO_REMOVE.forEach((f) => expect(result).not.toHaveProperty(f));
  });

  test('strips password fields', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue({
      uid: MODEL,
      attributes: {
        title: { type: 'string' },
        secret: { type: 'password' },
      },
    });

    const result = await service.transformDocument(
      { title: 'Hello', secret: 'hunter2' },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result).toEqual({ title: 'Hello' });
    expect(result).not.toHaveProperty('secret');
  });

  test('passes through fields with no attribute definition', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue({
      uid: MODEL,
      attributes: {},
    });

    const result = await service.transformDocument(
      { customField: 'value' },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result).toEqual({ customField: 'value' });
  });

  test('returns empty object for null/falsy data', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue({ uid: MODEL, attributes: {} });

    const result = await service.transformDocument(
      null as any,
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// transformDocument — component handling
// ---------------------------------------------------------------------------

describe('transformDocument — components', () => {
  test('processes a non-repeatable component recursively', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
      if (uid === MODEL) {
        return {
          uid: MODEL,
          attributes: {
            seo: { type: 'component', component: 'shared.seo', repeatable: false },
          },
        };
      }
      // shared.seo schema
      return {
        uid,
        attributes: {
          title: { type: 'string' },
          secret: { type: 'password' },
        },
      };
    });

    const result = await service.transformDocument(
      { seo: { title: 'SEO title', secret: 'pass', id: 1 } },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result).toEqual({ seo: { title: 'SEO title' } });
  });

  test('passes null component value through as-is', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
      if (uid === MODEL) {
        return {
          uid: MODEL,
          attributes: { seo: { type: 'component', component: 'shared.seo', repeatable: false } },
        };
      }
      return { uid, attributes: {} };
    });

    const result = await service.transformDocument(
      { seo: null },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result).toEqual({ seo: null });
  });

  test('processes a repeatable component and adds __temp_key__', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
      if (uid === MODEL) {
        return {
          uid: MODEL,
          attributes: {
            sections: { type: 'component', component: 'shared.section', repeatable: true },
          },
        };
      }
      return { uid, attributes: { heading: { type: 'string' }, id: { type: 'integer' } } };
    });

    const result = await service.transformDocument(
      {
        sections: [
          { heading: 'First', id: 1 },
          { heading: 'Second', id: 2 },
        ],
      },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    const sections = result.sections as any[];
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({ heading: 'First', __temp_key__: 1 });
    expect(sections[1]).toMatchObject({ heading: 'Second', __temp_key__: 2 });
    // id is in FIELDS_TO_REMOVE so it should be stripped
    expect(sections[0]).not.toHaveProperty('id');
  });

  test('strips passwords inside components', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
      if (uid === MODEL) {
        return {
          uid: MODEL,
          attributes: { auth: { type: 'component', component: 'shared.auth', repeatable: false } },
        };
      }
      return { uid, attributes: { username: { type: 'string' }, password: { type: 'password' } } };
    });

    const result = await service.transformDocument(
      { auth: { username: 'admin', password: 'secret' } },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect((result.auth as any).username).toBe('admin');
    expect(result.auth).not.toHaveProperty('password');
  });
});

// ---------------------------------------------------------------------------
// transformDocument — dynamic zone handling
// ---------------------------------------------------------------------------

describe('transformDocument — dynamic zones', () => {
  test('processes each item with its __component schema and adds __temp_key__', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
      if (uid === MODEL) {
        return {
          uid: MODEL,
          attributes: { body: { type: 'dynamiczone' } },
        };
      }
      if (uid === 'blocks.text') {
        return { uid, attributes: { content: { type: 'richtext' } } };
      }
      if (uid === 'blocks.image') {
        return { uid, attributes: { url: { type: 'string' } } };
      }
      return { uid, attributes: {} };
    });

    const result = await service.transformDocument(
      {
        body: [
          { __component: 'blocks.text', content: 'Hello', id: 10 },
          { __component: 'blocks.image', url: 'https://example.com/img.png', id: 11 },
        ],
      },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    const body = result.body as any[];
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({
      __component: 'blocks.text',
      content: 'Hello',
      __temp_key__: 1,
    });
    expect(body[1]).toMatchObject({
      __component: 'blocks.image',
      url: 'https://example.com/img.png',
      __temp_key__: 2,
    });
    // id is in FIELDS_TO_REMOVE
    expect(body[0]).not.toHaveProperty('id');
  });
});

// ---------------------------------------------------------------------------
// transformDocument — relation handling (transformRelationsForLocale)
// ---------------------------------------------------------------------------

describe('transformDocument — relation handling', () => {
  const TARGET_UID = 'api::category.category';

  const modelWithRelation = (relationDef: object) => ({
    uid: MODEL,
    attributes: {
      title: { type: 'string' },
      category: { type: 'relation', ...relationDef },
    },
  });

  test('returns empty connect/disconnect for morph relations', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue(
      modelWithRelation({ relation: 'morphToOne', target: TARGET_UID })
    );

    const result = await service.transformDocument(
      { title: 'Hi', category: { documentId: 'cat-1', id: 1 } },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result.category).toEqual({ connect: [], disconnect: [] });
  });

  test('returns empty when target UID is missing', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue(
      modelWithRelation({ relation: 'manyToOne' /* no target */ })
    );

    const result = await service.transformDocument(
      { title: 'Hi', category: { documentId: 'cat-1', id: 1 } },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result.category).toEqual({ connect: [], disconnect: [] });
  });

  test('returns empty when user cannot read the target content type', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue(
      modelWithRelation({ relation: 'manyToOne', target: TARGET_UID })
    );

    const result = await service.transformDocument(
      { title: 'Hi', category: { documentId: 'cat-1', id: 1 } },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility(false)
    );

    expect(result.category).toEqual({ connect: [], disconnect: [] });
  });

  test('returns empty for null relation value', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue(
      modelWithRelation({ relation: 'manyToOne', target: TARGET_UID })
    );

    const result = await service.transformDocument(
      { title: 'Hi', category: null },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result.category).toEqual({ connect: [], disconnect: [] });
  });

  test('returns empty when relation has no valid documentId', async () => {
    const { service, mockStrapi } = makeService();
    (mockStrapi.getModel as jest.Mock).mockReturnValue(
      modelWithRelation({ relation: 'manyToOne', target: TARGET_UID })
    );

    const result = await service.transformDocument(
      { title: 'Hi', category: { id: 1 /* no documentId */ } },
      MODEL as any,
      TARGET_LOCALE,
      makeUserAbility()
    );

    expect(result.category).toEqual({ connect: [], disconnect: [] });
  });

  // -------------------------------------------------------------------------
  // Non-localized target (resolveRelationsForLocaleBatch)
  // -------------------------------------------------------------------------

  describe('non-localized target', () => {
    test('returns the relation as-is (no locale resolution needed)', async () => {
      const { service, mockStrapi, dbFindMany } = makeService();

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        // non-localized target model
        return { uid, options: {}, attributes: { name: { type: 'string' } } };
      });

      // i18n says target is NOT localized
      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(false);

      dbFindMany.mockResolvedValue([{ documentId: 'cat-1', id: 10, name: 'Tech' }]);

      const result = await service.transformDocument(
        { title: 'Hi', category: { documentId: 'cat-1', id: 5 } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      const connect = (result.category as any).connect;
      expect(connect).toHaveLength(1);
      // For a non-localized target the id from the source is preserved
      expect(connect[0]).toMatchObject({ documentId: 'cat-1', id: 5 });
    });

    test('filters out relations without a numeric id', async () => {
      const { service, mockStrapi } = makeService();

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        return { uid, options: {}, attributes: { name: { type: 'string' } } };
      });

      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(false);

      const result = await service.transformDocument(
        // id is undefined — should be dropped
        { title: 'Hi', category: { documentId: 'cat-1' } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      expect((result.category as any).connect).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Localized target (resolveRelationsForLocaleBatch + byDocumentId map)
  // -------------------------------------------------------------------------

  describe('localized target', () => {
    const setupLocalized = (dbRows: object[]) => {
      const { service, mockStrapi, dbFindMany } = makeService();

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        // localized target, no D&P
        return { uid, options: {}, attributes: { name: { type: 'string' } } };
      });

      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(true);

      dbFindMany.mockResolvedValue(dbRows);

      return { service, mockStrapi };
    };

    test('resolves relation to the matching target-locale entry', async () => {
      const { service } = setupLocalized([
        { documentId: 'cat-1', id: 20, locale: TARGET_LOCALE, publishedAt: null },
      ]);

      const result = await service.transformDocument(
        { title: 'Hi', category: { documentId: 'cat-1', id: 5, locale: 'en' } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      const connect = (result.category as any).connect;
      expect(connect).toHaveLength(1);
      expect(connect[0]).toMatchObject({ documentId: 'cat-1', id: 20, locale: TARGET_LOCALE });
    });

    test('returns empty connect when relation not found in target locale', async () => {
      const { service } = setupLocalized([]); // no rows in target locale

      const result = await service.transformDocument(
        { title: 'Hi', category: { documentId: 'cat-1', id: 5, locale: 'en' } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      expect((result.category as any).connect).toHaveLength(0);
    });

    test('prefers draft (null publishedAt) over published for the same documentId', async () => {
      const { service, mockStrapi } = makeService();

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        return { uid, options: {}, attributes: { name: { type: 'string' } } };
      });

      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(true);

      // DB returns published first, then draft — draft should win regardless of order
      (mockStrapi.db.query as jest.Mock).mockReturnValue({
        findMany: jest.fn().mockResolvedValue([
          { documentId: 'cat-1', id: 99, locale: TARGET_LOCALE, publishedAt: '2024-01-01' },
          { documentId: 'cat-1', id: 100, locale: TARGET_LOCALE, publishedAt: null },
        ]),
      });

      const result = await service.transformDocument(
        { title: 'Hi', category: { documentId: 'cat-1', id: 5, locale: 'en' } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      const connect = (result.category as any).connect;
      expect(connect).toHaveLength(1);
      expect(connect[0].id).toBe(100); // draft entry, not the published one
    });

    test('falls back to published when no draft exists for documentId', async () => {
      const { service, mockStrapi } = makeService();

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        return { uid, options: {}, attributes: { name: { type: 'string' } } };
      });

      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(true);

      (mockStrapi.db.query as jest.Mock).mockReturnValue({
        findMany: jest
          .fn()
          .mockResolvedValue([
            { documentId: 'cat-1', id: 99, locale: TARGET_LOCALE, publishedAt: '2024-01-01' },
          ]),
      });

      const result = await service.transformDocument(
        { title: 'Hi', category: { documentId: 'cat-1', id: 5, locale: 'en' } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      const connect = (result.category as any).connect;
      expect(connect).toHaveLength(1);
      expect(connect[0].id).toBe(99);
    });
  });

  // -------------------------------------------------------------------------
  // Status and label enrichment (addStatusToRelationsBatch)
  // -------------------------------------------------------------------------

  describe('status enrichment', () => {
    test('does not add status when D&P is disabled on target model', async () => {
      const { service, mockStrapi, dbFindMany } = makeService();

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        // no draftAndPublish option → hasDraftAndPublish returns false
        return { uid, options: {}, attributes: { name: { type: 'string' } } };
      });

      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(false);

      dbFindMany.mockResolvedValue([{ documentId: 'cat-1', id: 10, name: 'Tech' }]);

      const result = await service.transformDocument(
        { category: { documentId: 'cat-1', id: 10 } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      expect((result.category as any).connect[0]).not.toHaveProperty('status');
    });

    test('adds status via document-metadata.getStatus when D&P is enabled', async () => {
      const { service, mockStrapi } = makeService();
      const getStatus = jest.fn().mockReturnValue('published');

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        // D&P enabled
        return {
          uid,
          options: { draftAndPublish: true },
          attributes: { name: { type: 'string' } },
        };
      });

      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(false);

      // Override document-metadata with our spy
      (mockStrapi as any).plugins['content-manager'].services['document-metadata'].getStatus =
        getStatus;

      // First findMany = locale resolution (non-localized → not called)
      // Second findMany = status entries, Third = label entries
      let callCount = 0;
      (mockStrapi.db.query as jest.Mock).mockReturnValue({
        findMany: jest.fn().mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            // status entries
            return Promise.resolve([{ documentId: 'cat-1', id: 10, publishedAt: '2024-01-01' }]);
          }
          // label entries
          return Promise.resolve([{ documentId: 'cat-1', id: 10, name: 'Tech' }]);
        }),
      });

      const result = await service.transformDocument(
        { category: { documentId: 'cat-1', id: 10 } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      expect(getStatus).toHaveBeenCalled();
      expect((result.category as any).connect[0]).toHaveProperty('status', 'published');
    });

    test('uses documentId:locale groupKey for localized target when computing status', async () => {
      const { service, mockStrapi } = makeService();
      const getStatus = jest.fn().mockReturnValue('draft');

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        return {
          uid,
          options: { draftAndPublish: true },
          attributes: { name: { type: 'string' } },
        };
      });

      // target IS localized
      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(true);

      (mockStrapi as any).plugins['content-manager'].services['document-metadata'].getStatus =
        getStatus;

      let callCount = 0;
      (mockStrapi.db.query as jest.Mock).mockReturnValue({
        findMany: jest.fn().mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            // locale resolution
            return Promise.resolve([
              { documentId: 'cat-1', id: 20, locale: TARGET_LOCALE, publishedAt: null },
            ]);
          }
          if (callCount === 2) {
            // status entries
            return Promise.resolve([
              { documentId: 'cat-1', id: 20, locale: TARGET_LOCALE, publishedAt: null },
            ]);
          }
          // label entries
          return Promise.resolve([
            { documentId: 'cat-1', id: 20, locale: TARGET_LOCALE, name: 'Tech' },
          ]);
        }),
      });

      const result = await service.transformDocument(
        { category: { documentId: 'cat-1', id: 5, locale: 'en' } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      expect(getStatus).toHaveBeenCalled();
      expect((result.category as any).connect[0]).toHaveProperty('status', 'draft');
    });
  });

  // -------------------------------------------------------------------------
  // Label enrichment
  // -------------------------------------------------------------------------

  describe('label enrichment', () => {
    test('uses mainField value as label', async () => {
      const { service, mockStrapi, dbFindMany } = makeService();

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        return { uid, options: {}, attributes: { name: { type: 'string' } } };
      });

      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(false);

      dbFindMany.mockResolvedValue([{ documentId: 'cat-1', id: 10, name: 'Technology' }]);

      const result = await service.transformDocument(
        { category: { documentId: 'cat-1', id: 10 } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      expect((result.category as any).connect[0].label).toBe('Technology');
    });

    test('falls back to documentId as label when mainField is not a string', async () => {
      const { service, mockStrapi, dbFindMany } = makeService();

      (mockStrapi.getModel as jest.Mock).mockImplementation((uid: string) => {
        if (uid === MODEL) return modelWithRelation({ relation: 'manyToOne', target: TARGET_UID });
        return { uid, options: {}, attributes: { name: { type: 'string' } } };
      });

      (
        mockStrapi.plugins.i18n.services['content-types'].isLocalizedContentType as jest.Mock
      ).mockReturnValue(false);

      // name is null — should fall back to documentId
      dbFindMany.mockResolvedValue([{ documentId: 'cat-1', id: 10, name: null }]);

      const result = await service.transformDocument(
        { category: { documentId: 'cat-1', id: 10 } },
        MODEL as any,
        TARGET_LOCALE,
        makeUserAbility()
      );

      expect((result.category as any).connect[0].label).toBe('cat-1');
    });
  });
});
