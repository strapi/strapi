import { Ability, AbilityBuilder } from '@casl/ability';
import type { Core } from '@strapi/types';
import { z } from '@strapi/utils';

import {
  deriveDisplayedContentTypeMcpToolDefinitions,
  buildDataSchema,
  buildSortSchema,
  buildFiltersSchema,
  slugifyUidForMcpToolName,
  getComponentLeafPaths,
  type ContentManagerModelForMcp,
} from '../derive-content-type-mcp-tools';
import { ACTIONS } from '../../services/permission-checker';

// ---------------------------------------------------------------------------
// Type helpers derived from the source module's exported signatures
// ---------------------------------------------------------------------------

type DerivedToolDef = ReturnType<typeof deriveDisplayedContentTypeMcpToolDefinitions>[number];
type ToolHandlerFn = ReturnType<DerivedToolDef['createHandler']>;
type HandlerParams = Parameters<ToolHandlerFn>[0];
type TestAttrs = ContentManagerModelForMcp['attributes'];

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockStrapi = {
  get: jest.fn(() => ({ get: jest.fn(() => undefined) })),
  components: {
    'shared.seo': {
      attributes: {
        title: { type: 'string' },
        description: { type: 'text' },
        url: { type: 'text' },
      },
    },
    'shared.nested': {
      attributes: {
        label: { type: 'string' },
        inner: { type: 'component', component: 'shared.seo' },
      },
    },
    'shared.circular': {
      attributes: {
        name: { type: 'string' },
        self: { type: 'component', component: 'shared.circular' },
      },
    },
  },
} as unknown as Core.Strapi;

const baseModel = (overrides: Partial<ContentManagerModelForMcp>): ContentManagerModelForMcp => ({
  uid: 'api::article.article',
  kind: 'collectionType',
  apiID: 'article',
  options: {},
  attributes: {},
  ...overrides,
});

const makeUserAbility = (canResult = true): Ability => {
  const { can, build } = new AbilityBuilder(Ability);

  if (canResult === true) {
    can('manage', 'all');
  }

  return build();
};

const makeFieldRestrictedAbility = (
  permittedFields: string[],
  uid = 'api::article.article'
): Ability => {
  const { can, build } = new AbilityBuilder(Ability);

  for (const action of Object.values(ACTIONS)) {
    for (const field of permittedFields) {
      can(action, uid, field);
    }
  }

  return build();
};

const mockUser = { id: 42 };
const mockContext = { userAbility: makeUserAbility(), user: mockUser };

const mockExtra: HandlerParams['extra'] = {
  signal: new AbortController().signal,
  requestId: 'test-request-id',
  sendNotification: jest.fn(),
  sendRequest: jest.fn(),
};

const makePermissionChecker = (overrides: Record<string, jest.Mock> = {}) => ({
  cannot: {
    read: jest.fn(() => false),
    create: jest.fn(() => false),
    update: jest.fn(() => false),
    delete: jest.fn(() => false),
    publish: jest.fn(() => false),
    unpublish: jest.fn(() => false),
    discard: jest.fn(() => false),
  },
  can: {
    read: jest.fn(() => true),
    create: jest.fn(() => true),
    update: jest.fn(() => true),
  },
  sanitizeOutput: jest.fn((doc: unknown) => Promise.resolve(doc)),
  sanitizeCreateInput: jest.fn((data: unknown) => Promise.resolve(data)),
  sanitizeUpdateInput: jest.fn(() => jest.fn((data: unknown) => Promise.resolve(data))),
  sanitizedQuery: {
    read: jest.fn((q: unknown) => Promise.resolve(q)),
    update: jest.fn((q: unknown) => Promise.resolve(q)),
    delete: jest.fn((q: unknown) => Promise.resolve(q)),
    publish: jest.fn((q: unknown) => Promise.resolve(q)),
    unpublish: jest.fn((q: unknown) => Promise.resolve(q)),
    discard: jest.fn((q: unknown) => Promise.resolve(q)),
  },
  requiresEntity: { read: jest.fn(() => false) },
  ...overrides,
});

const makeDocumentManager = (
  overrides: Record<string, jest.Mock> = {}
): Record<string, jest.Mock> => ({
  findPage: jest.fn(() =>
    Promise.resolve({ results: [], pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } })
  ),
  findOne: jest.fn(() => Promise.resolve(null)),
  findMany: jest.fn(() => Promise.resolve([])),
  findLocales: jest.fn(() => Promise.resolve([])),
  exists: jest.fn(() => Promise.resolve(false)),
  create: jest.fn(() => Promise.resolve({ documentId: 'doc-1' })),
  update: jest.fn(() => Promise.resolve({ documentId: 'doc-1' })),
  delete: jest.fn(() => Promise.resolve({})),
  publish: jest.fn(() => Promise.resolve([{ documentId: 'doc-1' }])),
  unpublish: jest.fn(() => Promise.resolve({ documentId: 'doc-1' })),
  discardDraft: jest.fn(() => Promise.resolve({ documentId: 'doc-1' })),
  ...overrides,
});

const makeDocumentMetadata = () => ({
  getManyAvailableStatus: jest.fn(() => Promise.resolve([])),
  getStatus: jest.fn(() => 'draft'),
  formatDocumentWithMetadata: jest.fn((uid: string, doc: unknown) =>
    Promise.resolve({ ...(doc as object), meta: {} })
  ),
});

const makePopulateBuilder = () => {
  const builder = {
    populateFromQuery: jest.fn().mockReturnThis(),
    populateDeep: jest.fn().mockReturnThis(),
    countRelations: jest.fn().mockReturnThis(),
    withPopulateOverride: jest.fn().mockReturnThis(),
    build: jest.fn(() => Promise.resolve({})),
  };
  return jest.fn(() => builder);
};

// Minimal strapi-shaped object that satisfies the unit.setup.js global setter.
// Used by handlers that reference bare `global.strapi` (singleGetHandler).
const makeMinimalGlobalStrapi = (dbOverrides?: Record<string, unknown>): Core.Strapi =>
  ({
    plugins: {},
    apis: {},
    admin: { services: {} },
    getModel: jest.fn(() => ({})),
    contentTypes: {},
    db: dbOverrides?.db ?? {
      transaction: jest.fn(async (cb: () => Promise<unknown>) => cb()),
      query: jest.fn(() => ({ findOne: jest.fn(() => Promise.resolve(null)) })),
    },
    ...dbOverrides,
  }) as unknown as Core.Strapi;

// ---------------------------------------------------------------------------
// Global mock setup
// ---------------------------------------------------------------------------

// We mock at module level so handlers can use getService internally.
const mockPermissionChecker = makePermissionChecker();
const mockDocumentManager = makeDocumentManager();
const mockDocumentMetadata = makeDocumentMetadata();
const mockPopulateBuilder = makePopulateBuilder();

jest.mock('../../utils', () => ({
  getService: jest.fn((name: string) => {
    if (name === 'permission-checker') {
      return { create: jest.fn(() => mockPermissionChecker) };
    }
    if (name === 'document-manager') {
      return mockDocumentManager;
    }
    if (name === 'document-metadata') {
      return mockDocumentMetadata;
    }
    if (name === 'populate-builder') {
      return mockPopulateBuilder;
    }
    throw new Error(`Unknown service: ${name}`);
  }),
}));

jest.mock('../../controllers/validation/dimensions', () => ({
  getDocumentLocaleAndStatus: jest.fn(({ locale, status }: { locale?: string; status?: string }) =>
    Promise.resolve({ locale: locale ?? 'en', status: status ?? 'draft' })
  ),
}));

jest.mock('../../controllers/utils/metadata', () => ({
  formatDocumentWithMetadata: jest.fn((_checker: unknown, _uid: unknown, doc: unknown) =>
    Promise.resolve({ data: doc, meta: {} })
  ),
}));

jest.mock('../../controllers/utils/document-status', () => ({
  indexByDocumentId: jest.fn(() => new Map()),
}));

jest.mock('../../services/utils/populate', () => ({
  getPopulateForLocalizations: jest.fn(() => ({})),
}));

// shapeRelationsForMcp is a passthrough in handler tests.
// Pure shaping logic is covered by mcp/sanitizers/__tests__/shape-relations.test.ts.
jest.mock('../sanitizers/shape-relations', () => ({
  shapeRelationsForMcp: jest.fn((_uid: unknown, data: unknown) => Promise.resolve(data)),
}));

const mockSetCreatorFields = jest.fn(() => (data: unknown) => Promise.resolve(data));

jest.mock('@strapi/utils', () => {
  const actual = jest.requireActual('@strapi/utils');
  return {
    ...actual,
    setCreatorFields: (...args: Parameters<typeof mockSetCreatorFields>) =>
      mockSetCreatorFields(...args),
    errors: {
      ForbiddenError: class ForbiddenError extends Error {
        constructor(message = 'Forbidden') {
          super(message);
          this.name = 'ForbiddenError';
        }
      },
      NotFoundError: class NotFoundError extends Error {
        constructor(message = 'Not Found') {
          super(message);
          this.name = 'NotFoundError';
        }
      },
      ValidationError: class ValidationError extends Error {
        constructor(message = 'Validation Error') {
          super(message);
          this.name = 'ValidationError';
        }
      },
    },
    contentTypes: {
      hasDraftAndPublish: jest.fn(() => false),
      // Mirror the real isWritableAttribute: exclude id, documentId, and attrs with writable: false
      isWritableAttribute: jest.fn(
        (model: { attributes: Record<string, { writable?: boolean }> }, key: string) => {
          const SYSTEM_KEYS = new Set([
            'id',
            'documentId',
            'createdAt',
            'updatedAt',
            'publishedAt',
          ]);
          if (SYSTEM_KEYS.has(key) === true) return false;
          const attr = model.attributes?.[key];
          return attr === undefined || attr.writable !== false;
        }
      ),
      isPrivateAttribute: jest.fn(
        (model: { attributes: Record<string, { private?: boolean }> }, key: string) =>
          model?.attributes?.[key]?.private === true
      ),
    },
    async: {
      map: jest.fn(async (arr: unknown[], fn: (item: unknown) => Promise<unknown>) =>
        Promise.all(arr.map(fn))
      ),
      pipe:
        (...fns: Array<(v: unknown) => unknown>) =>
        (v: unknown) =>
          fns.reduce(async (acc, fn) => fn(await acc), Promise.resolve(v)),
    },
  };
});

// ---------------------------------------------------------------------------
// slugifyUidForMcpToolName
// ---------------------------------------------------------------------------

describe('slugifyUidForMcpToolName', () => {
  it('maps api UIDs to the first model-name segment only', () => {
    expect(slugifyUidForMcpToolName('api::article.article')).toBe('article');
  });

  it('maps plugin UIDs to namespace-model_content-type per documented format', () => {
    expect(slugifyUidForMcpToolName('plugin::i18n.locale')).toBe('plugin-i18n_locale');
  });

  it('includes the content-type suffix so plugin models with the same prefix stay unique', () => {
    expect(slugifyUidForMcpToolName('plugin::cms-basics.page')).toBe('plugin-cms-basics_page');
    expect(slugifyUidForMcpToolName('plugin::cms-basics.settings')).toBe(
      'plugin-cms-basics_settings'
    );
  });
});

// ---------------------------------------------------------------------------
// Tool structure tests (unchanged from original)
// ---------------------------------------------------------------------------

describe('deriveDisplayedContentTypeMcpToolDefinitions', () => {
  it('derives unique tool names for plugin content types that share a model-name prefix', () => {
    const models = [
      baseModel({
        uid: 'plugin::cms-basics.page',
        apiID: 'page',
        kind: 'collectionType',
      }),
      baseModel({
        uid: 'plugin::cms-basics.settings',
        apiID: 'settings',
        kind: 'singleType',
      }),
    ];

    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, models);
    const names = tools.map((tool) => tool.name);
    const uniqueNames = new Set(names);

    expect(uniqueNames.size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining([
        'list_plugin-cms-basics_page',
        'get_plugin-cms-basics_settings',
        'write_plugin-cms-basics_settings',
      ])
    );
  });

  it('emits list/get with explorer.read for a collection type', () => {
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [baseModel({})]);
    const list = tools.find((t) => t.name === 'list_article');
    const get = tools.find((t) => t.name === 'get_article');

    expect(list).toBeDefined();
    expect(get).toBeDefined();
    expect(list?.auth).toEqual({
      policies: [{ action: ACTIONS.read, subject: 'api::article.article' }],
    });
    expect(get?.auth).toEqual({
      policies: [{ action: ACTIONS.read, subject: 'api::article.article' }],
    });
  });

  it('adds publish, unpublish, and discard_draft when draft and publish is enabled', () => {
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
      baseModel({ options: { draftAndPublish: true } }),
    ]);

    const names = tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['publish_article', 'unpublish_article', 'discard_article_draft'])
    );

    const discard = tools.find((t) => t.name === 'discard_article_draft');
    const publish = tools.find((t) => t.name === 'publish_article');

    expect(discard?.auth.policies[0].action).toBe(ACTIONS.discard);
    expect(publish?.auth.policies[0].action).toBe(ACTIONS.publish);
  });

  it('omits draft workflow tools when draft and publish is disabled', () => {
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
      baseModel({ options: { draftAndPublish: false } }),
    ]);
    const names = tools.map((t) => t.name);
    expect(names).not.toContain('publish_article');
    expect(names).not.toContain('discard_article_draft');
  });

  it('uses single-type tool names with unified write tool', () => {
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
      baseModel({ kind: 'singleType', uid: 'api::global.global', apiID: 'global' }),
    ]);
    const names = tools.map((t) => t.name);
    expect(names).toContain('get_global');
    expect(names).toContain('write_global');
    expect(names).not.toContain('create_global');
    expect(names).not.toContain('update_global');
    expect(names).not.toContain('list_global');

    const write = tools.find((t) => t.name === 'write_global');
    expect(write?.auth.policies.map((p) => p.action)).toEqual(
      expect.arrayContaining([ACTIONS.create, ACTIONS.update])
    );
  });
});

// ---------------------------------------------------------------------------
// Input / output schema tests
// ---------------------------------------------------------------------------

describe('tool input schemas', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ options: { draftAndPublish: true } }),
  ]);

  const findTool = (name: string) => {
    const tool = tools.find((t) => t.name === name);
    if (tool === undefined) throw new Error(`Tool "${name}" not found`);
    return tool;
  };

  it('list tool accepts optional locale, status, page, pageSize, sort, filters', () => {
    const schema = findTool('list_article').resolveInputSchema(mockContext);
    const shape = schema.shape;
    expect(shape.locale).toBeDefined();
    expect(shape.status).toBeDefined();
    expect(shape.page).toBeDefined();
    expect(shape.pageSize).toBeDefined();
    expect(shape.sort).toBeDefined();
    expect(shape.filters).toBeDefined();
  });

  it('get tool requires documentId, accepts optional locale and status', () => {
    const schema = findTool('get_article').resolveInputSchema(mockContext);
    const shape = schema.shape;
    expect(shape.documentId).toBeDefined();
    expect(shape.locale).toBeDefined();
    expect(shape.status).toBeDefined();
    // documentId must be present (no optional())
    const result = schema.safeParse({ locale: 'en' });
    expect(result.success).toBe(false);
  });

  it('documentId argument description clarifies canonical identity across versions', () => {
    const schema = findTool('get_article').resolveInputSchema(mockContext);
    const documentIdDescription = (schema.shape.documentId as { description?: string }).description;

    expect(documentIdDescription).toContain('Stable document ID');
    expect(documentIdDescription).toContain('canonical identifier');
  });

  it('create tool requires data', () => {
    const schema = findTool('create_article').resolveInputSchema(mockContext);
    const result = schema.safeParse({ locale: 'en' }); // missing data
    expect(result.success).toBe(false);
  });

  it('update tool requires documentId and data', () => {
    const schema = findTool('update_article').resolveInputSchema(mockContext);
    expect(schema.safeParse({ documentId: 'abc', data: {} }).success).toBe(true);
    expect(schema.safeParse({ data: {} }).success).toBe(false); // missing documentId
  });

  it('unpublish tool accepts optional discardDraft boolean', () => {
    const schema = findTool('unpublish_article').resolveInputSchema(mockContext);
    expect(schema.safeParse({ documentId: 'abc', discardDraft: true }).success).toBe(true);
    expect(schema.safeParse({ documentId: 'abc', discardDraft: 'yes' }).success).toBe(false);
  });

  it('narrows create data schema to fields permitted for create action', () => {
    const model = baseModel({
      attributes: {
        title: { type: 'string', required: true },
        body: { type: 'text' },
        secret: { type: 'string' },
      } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const createTool = tools.find((t) => t.name === 'create_article')!;
    const context = {
      userAbility: makeFieldRestrictedAbility(['title']),
      user: mockUser,
    };

    const schema = createTool.resolveInputSchema(context);
    expect(schema.safeParse({ data: { title: 'Hi' } }).success).toBe(true);
    expect(schema.safeParse({ data: { title: 'Hi', body: 'text' } }).success).toBe(false);
    expect(schema.safeParse({ data: { secret: 'x' } }).success).toBe(false);
  });

  it('narrows update data schema to fields permitted for update action', () => {
    const model = baseModel({
      attributes: {
        title: { type: 'string' },
        body: { type: 'text' },
      } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const updateTool = tools.find((t) => t.name === 'update_article')!;
    const context = {
      userAbility: makeFieldRestrictedAbility(['body']),
      user: mockUser,
    };

    const schema = updateTool.resolveInputSchema(context);
    expect(schema.safeParse({ documentId: 'abc', data: { body: 'text' } }).success).toBe(true);
    expect(schema.safeParse({ documentId: 'abc', data: { title: 'Hi' } }).success).toBe(false);
  });

  it('narrows list sort and filters to fields permitted for read action', () => {
    const model = baseModel({
      attributes: {
        title: { type: 'string' },
        count: { type: 'integer' },
      } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const listTool = tools.find((t) => t.name === 'list_article')!;
    const context = {
      userAbility: makeFieldRestrictedAbility(['title']),
      user: mockUser,
    };

    const schema = listTool.resolveInputSchema(context);
    expect(schema.safeParse({ sort: 'title:asc' }).success).toBe(true);
    expect(schema.safeParse({ sort: 'count:desc' }).success).toBe(false);
    expect(schema.safeParse({ filters: { title: { $eq: 'x' } } }).success).toBe(true);
    expect(schema.safeParse({ filters: { count: { $gt: 1 } } }).success).toBe(false);
  });

  it('narrows document output schema to fields permitted for read action', () => {
    const model = baseModel({
      attributes: {
        title: { type: 'string' },
        body: { type: 'text' },
      } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const getTool = tools.find((t) => t.name === 'get_article')!;
    const context = {
      userAbility: makeFieldRestrictedAbility(['title']),
      user: mockUser,
    };

    const schema = getTool.resolveOutputSchema(context);
    const dataSchema = schema.shape.data;
    expect(dataSchema).toBeInstanceOf(z.ZodNullable);
    const objectSchema = (dataSchema as z.ZodNullable<z.ZodObject<z.ZodRawShape>>).unwrap();
    expect(Object.keys(objectSchema.shape)).toEqual(['title']);
  });

  it('output schemas use loose mode so runtime fields (e.g. status) pass client validation', () => {
    const model = baseModel({
      attributes: { title: { type: 'string' } } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const getTool = tools.find((t) => t.name === 'get_article')!;
    const listTool = tools.find((t) => t.name === 'list_article')!;

    const getJsonSchema = z.toJSONSchema(getTool.resolveOutputSchema(mockContext));
    const listJsonSchema = z.toJSONSchema(listTool.resolveOutputSchema(mockContext));

    expect(getJsonSchema).not.toHaveProperty('additionalProperties', false);
    expect(listJsonSchema).not.toHaveProperty('additionalProperties', false);

    const dataProperty = (
      getJsonSchema as { properties?: { data?: { additionalProperties?: unknown } } }
    ).properties?.data;
    expect(dataProperty).not.toHaveProperty('additionalProperties', false);
  });

  it('delete output schema accepts empty data for relation content types', () => {
    const model = baseModel({
      attributes: {
        title: { type: 'string' },
        category: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::category.category',
        },
      } as TestAttrs,
    });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const deleteTool = tools.find((t) => t.name === 'delete_article')!;
    const schema = deleteTool.resolveOutputSchema(mockContext);

    expect(schema.safeParse({ data: {} }).success).toBe(true);
    expect(JSON.stringify(z.toJSONSchema(schema))).not.toContain('category');
  });

  it('falls back to generic locale string when localeCodes are null', () => {
    const toolsWithoutLocales = deriveDisplayedContentTypeMcpToolDefinitions(
      mockStrapi,
      [baseModel({})],
      { localeCodes: null, defaultLocale: null }
    );
    const getTool = toolsWithoutLocales.find((tool) => tool.name === 'get_article');

    if (getTool === undefined) {
      throw new Error('Tool "get_article" not found');
    }

    const getSchema = getTool.resolveInputSchema(mockContext);
    expect(getSchema.safeParse({ documentId: 'abc', locale: 'de' }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 1 — Handler contract tests (baseline)
// ---------------------------------------------------------------------------

describe('collection-type handler: list', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [baseModel({})]);
  const listTool = tools.find((t) => t.name === 'list_article')!;

  const strapi = { getModel: jest.fn(() => ({})) } as unknown as Core.Strapi;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('returns empty results when documentManager.findPage returns nothing', async () => {
    const handler = listTool.createHandler(strapi, context);
    const result = await handler({ args: { locale: 'en', status: 'draft' }, extra: mockExtra });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      results: [],
      pagination: { page: 1, pageSize: 25, total: 0 },
    });
  });

  it('throws ForbiddenError when user cannot read', async () => {
    mockPermissionChecker.cannot.read.mockReturnValueOnce(true);
    const handler = listTool.createHandler(strapi, context);
    await expect(handler({ args: { locale: 'en' }, extra: mockExtra })).rejects.toThrow(
      'Forbidden'
    );
  });
});

describe('collection-type handler: get', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [baseModel({})]);
  const getTool = tools.find((t) => t.name === 'get_article')!;

  const strapi = {} as unknown as Core.Strapi;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws ForbiddenError when user cannot read', async () => {
    mockPermissionChecker.cannot.read.mockReturnValueOnce(true);
    const handler = getTool.createHandler(strapi, context);
    await expect(handler({ args: { documentId: 'abc' }, extra: mockExtra })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('throws NotFoundError when document does not exist', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce(null);
    mockDocumentManager.exists.mockResolvedValueOnce(false);

    const handler = getTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'missing', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Document not found');
  });

  it('returns empty data with meta when document exists but requested locale/status not found', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce(null);
    mockDocumentManager.exists.mockResolvedValueOnce(true);

    const handler = getTool.createHandler(strapi, context);
    const result = await handler({
      args: { documentId: 'doc-1', locale: 'fr' },
      extra: mockExtra,
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ data: {}, meta: expect.anything() });
  });

  it('returns document data when found', async () => {
    const doc = { documentId: 'abc', title: 'Hello' };
    mockDocumentManager.findOne.mockResolvedValueOnce(doc);

    const handler = getTool.createHandler(strapi, context);
    const result = await handler({ args: { documentId: 'abc', locale: 'en' }, extra: mockExtra });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ data: doc });
  });
});

describe('collection-type handler: create', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [baseModel({})]);
  const createTool = tools.find((t) => t.name === 'create_article')!;

  const strapi = makeMinimalGlobalStrapi();
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws ForbiddenError when user cannot create', async () => {
    mockPermissionChecker.cannot.create.mockReturnValueOnce(true);
    const handler = createTool.createHandler(strapi, context);
    await expect(handler({ args: { data: { title: 'x' } }, extra: mockExtra })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('calls documentManager.create with sanitized data', async () => {
    const handler = createTool.createHandler(strapi, context);
    await handler({ args: { data: { title: 'Hello' }, locale: 'en' }, extra: mockExtra });

    expect(mockDocumentManager.create).toHaveBeenCalled();
  });

  it('calls setCreatorFields with user (sets createdBy + updatedBy)', async () => {
    const handler = createTool.createHandler(strapi, context);
    await handler({ args: { data: { title: 'Hello' } }, extra: mockExtra });

    expect(mockSetCreatorFields).toHaveBeenCalledWith({ user: mockUser });
  });
});

describe('collection-type handler: delete', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [baseModel({})]);
  const deleteTool = tools.find((t) => t.name === 'delete_article')!;

  const strapi = {} as unknown as Core.Strapi;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws ForbiddenError when user cannot delete', async () => {
    mockPermissionChecker.cannot.delete.mockReturnValueOnce(true);
    const handler = deleteTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'abc', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
  });

  it('throws NotFoundError when no locales found', async () => {
    mockDocumentManager.findLocales.mockResolvedValueOnce([]);
    const handler = deleteTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'abc', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Document not found');
  });

  it('calls documentManager.delete when locale exists', async () => {
    mockDocumentManager.findLocales.mockResolvedValueOnce([{ documentId: 'abc' }]);
    const handler = deleteTool.createHandler(strapi, context);
    await handler({ args: { documentId: 'abc', locale: 'en' }, extra: mockExtra });
    expect(mockDocumentManager.delete).toHaveBeenCalled();
  });
});

describe('single-type handler: get', () => {
  const uid = 'api::global.global';
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ kind: 'singleType', uid, apiID: 'global', options: { draftAndPublish: true } }),
  ]);
  const getTool = tools.find((t) => t.name === 'get_global')!;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  afterEach(() => {
    global.strapi = makeMinimalGlobalStrapi() as unknown as typeof global.strapi;
  });

  it('throws ForbiddenError when user cannot read', async () => {
    const strapi = {} as unknown as Core.Strapi;
    const handler = getTool.createHandler(strapi, context);
    mockPermissionChecker.cannot.read.mockReturnValueOnce(true);
    await expect(handler({ args: { locale: 'en' }, extra: mockExtra })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('returns empty data with meta when version not found but document exists', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([]);
    const dbQueryFindOne = jest.fn(() => Promise.resolve({ documentId: 'st-1' }));
    // singleGetHandler uses bare `strapi` (global) for db.query — pre-existing design smell
    // TODO @Nico Phase 4 (F1): pass injected strapi instead of global.strapi in singleGetHandler
    const strapi = makeMinimalGlobalStrapi({
      db: {
        transaction: jest.fn(async (cb: () => Promise<unknown>) => cb()),
        query: jest.fn(() => ({ findOne: dbQueryFindOne })),
      },
    });
    global.strapi = strapi as unknown as typeof global.strapi;

    const handler = getTool.createHandler(strapi, context);
    const result = await handler({ args: { locale: 'fr' }, extra: mockExtra });

    expect(result.structuredContent).toMatchObject({ data: {}, meta: expect.anything() });
  });

  it('throws NotFoundError when version not found and no document at all', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([]);
    const dbQueryFindOne = jest.fn(() => Promise.resolve(null));
    const strapi = makeMinimalGlobalStrapi({
      db: {
        transaction: jest.fn(async (cb: () => Promise<unknown>) => cb()),
        query: jest.fn(() => ({ findOne: dbQueryFindOne })),
      },
    });
    global.strapi = strapi as unknown as typeof global.strapi;

    const handler = getTool.createHandler(strapi, context);
    await expect(handler({ args: { locale: 'en' }, extra: mockExtra })).rejects.toThrow(
      'Document not found'
    );
  });

  it('throws ForbiddenError when version found but entity-level read is forbidden', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([{ documentId: 'st-1' }]);
    mockPermissionChecker.cannot.read
      .mockReturnValueOnce(false) // global
      .mockReturnValueOnce(true); // entity

    // No db.query needed here — version is found so the fallback path isn't taken
    const strapi = makeMinimalGlobalStrapi();
    global.strapi = strapi as unknown as typeof global.strapi;
    const handler = getTool.createHandler(strapi, context);
    await expect(handler({ args: { locale: 'en' }, extra: mockExtra })).rejects.toThrow(
      'Forbidden'
    );
  });
});

describe('tool annotations', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ options: { draftAndPublish: true } }),
  ]);

  it('all tools have a non-empty description', () => {
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it('all tools have a valid auth object with policies containing action and subject', () => {
    for (const tool of tools) {
      expect(tool.auth.policies.length).toBeGreaterThan(0);
      for (const policy of tool.auth.policies) {
        expect(policy.action).toBeTruthy();
        expect(policy.subject).toBeTruthy();
      }
    }
  });

  it('all tools expose resolveInputSchema and resolveOutputSchema as resolver functions', () => {
    for (const tool of tools) {
      expect(typeof tool.resolveInputSchema(mockContext).safeParse).toBe('function');
      expect(typeof tool.resolveOutputSchema(mockContext).safeParse).toBe('function');
    }
  });

  it('all tools expose a createHandler factory function', () => {
    for (const tool of tools) {
      expect(typeof tool.createHandler).toBe('function');
    }
  });

  it('publish/unpublish/discard descriptions clarify stable document identity', () => {
    const publish = tools.find((tool) => tool.name === 'publish_article');
    const unpublish = tools.find((tool) => tool.name === 'unpublish_article');
    const discardDraft = tools.find((tool) => tool.name === 'discard_article_draft');

    expect(publish?.description).toContain('documentId');
    expect(publish?.description).toContain('different numeric id');
    expect(unpublish?.description).toContain('documentId');
    expect(unpublish?.description).toContain('different numeric id');
    expect(discardDraft?.description).toContain('stable identity');
  });
});

// ---------------------------------------------------------------------------
// buildDataSchema tests
// ---------------------------------------------------------------------------

/** Helper: build a minimal model object for isWritableAttribute calls in tests. */
const makeModel = (attrs: TestAttrs): ContentManagerModelForMcp => ({
  uid: 'api::test.test',
  kind: 'collectionType',
  apiID: 'test',
  options: {},
  attributes: attrs,
});

// ---------------------------------------------------------------------------
// Phase 2 — Schema builders (extract to mcp/schemas/*; keep exports stable)
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

  it('makes required attributes required in the schema', () => {
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

  it('per-ct create tool uses derived data schema', () => {
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

// ---------------------------------------------------------------------------
// getComponentLeafPaths tests
// ---------------------------------------------------------------------------

describe('getComponentLeafPaths', () => {
  it('resolves flat component into prefixed leaf paths', () => {
    const paths = getComponentLeafPaths(mockStrapi, 'shared.seo', 'SEO');
    expect(paths).toEqual(['SEO.title', 'SEO.description', 'SEO.url']);
  });

  it('resolves nested component recursively', () => {
    const paths = getComponentLeafPaths(mockStrapi, 'shared.nested', 'meta');
    expect(paths).toEqual([
      'meta.label',
      'meta.inner.title',
      'meta.inner.description',
      'meta.inner.url',
    ]);
  });

  it('handles circular component references via visited guard (falls back to prefix)', () => {
    // shared.circular has { name: string, self: component(shared.circular) }
    const paths = getComponentLeafPaths(mockStrapi, 'shared.circular', 'loop');
    expect(paths).toEqual(['loop.name', 'loop.self']);
  });

  it('falls back to prefix when component UID is unknown', () => {
    const paths = getComponentLeafPaths(mockStrapi, 'unknown.component', 'field');
    expect(paths).toEqual(['field']);
  });
});

// ---------------------------------------------------------------------------
// buildSortSchema tests
// ---------------------------------------------------------------------------

describe('buildSortSchema', () => {
  const attrs = {
    title: { type: 'string' },
    count: { type: 'integer' },
    status: { type: 'enumeration', enum: ['draft', 'published'] },
    body: { type: 'relation', relation: 'oneToMany', target: 'api::body.body' }, // non-scalar — must be excluded
  } as TestAttrs;

  it('returns z.never() when there are no scalar attributes', () => {
    const schema = buildSortSchema({
      body: { type: 'relation', relation: 'oneToMany', target: 'api::body.body' },
    } as TestAttrs);
    expect(schema.safeParse('title').success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(false);
  });

  it('accepts a string sort expression', () => {
    const schema = buildSortSchema(attrs);
    expect(schema.safeParse('title:asc').success).toBe(true);
    expect(schema.safeParse('count:desc').success).toBe(true);
  });

  it('accepts an array of strings', () => {
    const schema = buildSortSchema(attrs);
    expect(schema.safeParse(['title:asc', 'count:desc']).success).toBe(true);
  });

  it('accepts an object with direction values for known scalar fields', () => {
    const schema = buildSortSchema(attrs);
    expect(schema.safeParse({ title: 'asc' }).success).toBe(true);
    expect(schema.safeParse({ count: 'desc' }).success).toBe(true);
  });

  it('accepts an array of sort objects', () => {
    const schema = buildSortSchema(attrs);
    expect(schema.safeParse([{ title: 'asc' }, { count: 'desc' }]).success).toBe(true);
  });

  it('rejects an object direction value other than asc/desc', () => {
    const schema = buildSortSchema(attrs);
    expect(schema.safeParse({ title: 'random' }).success).toBe(false);
  });

  it('is optional — undefined is valid', () => {
    const schema = buildSortSchema(attrs);
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it('list tool sort field is constrained to scalar attributes', () => {
    const model = baseModel({ attributes: attrs });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const listTool = tools.find((t) => t.name === 'list_article')!;
    const schema = listTool.resolveInputSchema(mockContext);

    expect(schema.safeParse({ sort: 'title:asc' }).success).toBe(true);
    expect(schema.safeParse({ sort: { title: 'asc', count: 'desc' } }).success).toBe(true);
    expect(schema.safeParse({ sort: [{ title: 'asc' }] }).success).toBe(true);
  });

  it('excludes scalar fields not in permittedFields set', () => {
    const attrs = {
      title: { type: 'string' },
      count: { type: 'integer' },
    } as TestAttrs;
    const permitted = new Set(['title']);
    const schema = buildSortSchema(attrs, permitted);
    expect(schema.safeParse({ title: 'asc' }).success).toBe(true);
    expect(schema.safeParse({ count: 'desc' }).success).toBe(false);
    expect(schema.description).toContain('title');
    expect(schema.description).not.toContain('count');
  });

  it('excludes private scalar fields from sort schema description and object shape', () => {
    const schema = buildSortSchema({
      title: { type: 'string' },
      secret: { type: 'string', private: true },
    } as TestAttrs);
    // Private field must not appear in the schema description surfaced to the AI
    expect(schema.description).not.toContain('secret');
    expect(schema.description).toContain('title');
  });
});

// ---------------------------------------------------------------------------
// buildFiltersSchema tests
// ---------------------------------------------------------------------------

describe('buildFiltersSchema', () => {
  const attrs = {
    title: { type: 'string' },
    count: { type: 'integer' },
    active: { type: 'boolean' },
    status: { type: 'enumeration', enum: ['draft', 'published'] },
    body: { type: 'relation', relation: 'oneToMany', target: 'api::body.body' }, // non-scalar — excluded
  } as TestAttrs;

  it('returns z.never() when there are no scalar attributes', () => {
    const schema = buildFiltersSchema({
      body: { type: 'relation', relation: 'oneToMany', target: 'api::body.body' },
    } as TestAttrs);
    expect(schema.safeParse({ title: { $eq: 'x' } }).success).toBe(false);
  });

  it('is optional — undefined is valid', () => {
    const schema = buildFiltersSchema(attrs);
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it('accepts a simple field equality filter', () => {
    const schema = buildFiltersSchema(attrs);
    expect(schema.safeParse({ title: { $eq: 'hello' } }).success).toBe(true);
  });

  it('accepts $contains operator on string field', () => {
    const schema = buildFiltersSchema(attrs);
    expect(schema.safeParse({ title: { $contains: 'foo' } }).success).toBe(true);
  });

  it('accepts $gt/$lt operators on integer field', () => {
    const schema = buildFiltersSchema(attrs);
    expect(schema.safeParse({ count: { $gt: 5 } }).success).toBe(true);
    expect(schema.safeParse({ count: { $lt: 100 } }).success).toBe(true);
  });

  it('accepts $and with nested filter objects', () => {
    const schema = buildFiltersSchema(attrs);
    expect(
      schema.safeParse({
        $and: [{ title: { $contains: 'foo' } }, { count: { $gt: 5 } }],
      }).success
    ).toBe(true);
  });

  it('accepts $or with nested filter objects', () => {
    const schema = buildFiltersSchema(attrs);
    expect(
      schema.safeParse({
        $or: [{ title: { $eq: 'a' } }, { title: { $eq: 'b' } }],
      }).success
    ).toBe(true);
  });

  it('accepts $not wrapping a filter object', () => {
    const schema = buildFiltersSchema(attrs);
    expect(schema.safeParse({ $not: { title: { $eq: 'forbidden' } } }).success).toBe(true);
  });

  it('accepts direct value (implicit $eq) on field', () => {
    const schema = buildFiltersSchema(attrs);
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
  });

  it('accepts enumeration value in filter', () => {
    const schema = buildFiltersSchema(attrs);
    expect(schema.safeParse({ status: { $eq: 'draft' } }).success).toBe(true);
  });

  it('accepts boolean value in filter', () => {
    const schema = buildFiltersSchema(attrs);
    expect(schema.safeParse({ active: { $eq: true } }).success).toBe(true);
    expect(schema.safeParse({ active: true }).success).toBe(true);
    expect(schema.safeParse({ active: 'yes' }).success).toBe(false);
  });

  it('list tool filters are wired into the input schema', () => {
    const model = baseModel({ attributes: attrs });
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const listTool = tools.find((t) => t.name === 'list_article')!;
    const schema = listTool.resolveInputSchema(mockContext);

    expect(schema.safeParse({ filters: { title: { $contains: 'foo' } } }).success).toBe(true);
    expect(schema.safeParse({ filters: { $and: [{ title: { $eq: 'x' } }] } }).success).toBe(true);
  });

  it('excludes scalar fields not in permittedFields set', () => {
    const attrs = {
      title: { type: 'string' },
      count: { type: 'integer' },
    } as TestAttrs;
    const permitted = new Set(['title']);
    const schema = buildFiltersSchema(attrs, permitted);
    expect(schema.safeParse({ title: { $eq: 'hello' } }).success).toBe(true);
    expect(schema.safeParse({ count: { $gt: 5 } }).success).toBe(false);
    expect(schema.description).toContain('title');
    expect(schema.description).not.toContain('count');
  });

  it('excludes private scalar fields from filters schema description', () => {
    const schema = buildFiltersSchema({
      title: { type: 'string' },
      secret: { type: 'string', private: true },
    } as TestAttrs);
    // Private field must not appear in the schema description surfaced to the AI
    expect(schema.description).not.toContain('secret');
    expect(schema.description).toContain('title');
  });
});

// ---------------------------------------------------------------------------
// Locale permission segregation tests
// ---------------------------------------------------------------------------

/**
 * Builds a permission checker mock whose `cannot(action, entity)` callable
 * enforces locale restrictions: returns true (cannot) when `entity.locale`
 * is not in `permittedLocales`.
 */
const makeLocaleRestrictedPermissionChecker = (permittedLocales: string[]) => {
  const cannotFn = jest.fn((_action: string, entity?: { locale?: string }) => {
    if (entity !== undefined && entity.locale !== undefined) {
      return permittedLocales.includes(entity.locale) === false;
    }
    return false;
  }) as jest.Mock & {
    read: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    publish: jest.Mock;
    unpublish: jest.Mock;
    discard: jest.Mock;
  };

  cannotFn.read = jest.fn(() => false);
  cannotFn.create = jest.fn(() => false);
  cannotFn.update = jest.fn(() => false);
  cannotFn.delete = jest.fn(() => false);
  cannotFn.publish = jest.fn(() => false);
  cannotFn.unpublish = jest.fn(() => false);
  cannotFn.discard = jest.fn(() => false);

  return {
    cannot: cannotFn,
    can: { read: jest.fn(() => true), create: jest.fn(() => true), update: jest.fn(() => true) },
    sanitizeOutput: jest.fn((doc: unknown) => Promise.resolve(doc)),
    sanitizeCreateInput: jest.fn((data: unknown) => Promise.resolve(data)),
    sanitizeUpdateInput: jest.fn(() => jest.fn((data: unknown) => Promise.resolve(data))),
    sanitizedQuery: {
      read: jest.fn((q: unknown) => Promise.resolve(q)),
      update: jest.fn((q: unknown) => Promise.resolve(q)),
      delete: jest.fn((q: unknown) => Promise.resolve(q)),
      publish: jest.fn((q: unknown) => Promise.resolve(q)),
      unpublish: jest.fn((q: unknown) => Promise.resolve(q)),
      discard: jest.fn((q: unknown) => Promise.resolve(q)),
    },
    requiresEntity: { read: jest.fn(() => false) },
  };
};

/**
 * Builds a mock strapi instance that reports the given uid as localized (i18n).
 */
const makeLocalizedStrapi = (uid: string): Core.Strapi =>
  ({
    get: jest.fn(() => ({ get: jest.fn(() => undefined) })),
    contentTypes: {
      [uid]: {
        pluginOptions: { i18n: { localized: true } },
      },
    },
  }) as unknown as Core.Strapi;

/**
 * Builds a mock strapi instance that reports the given uid as NOT localized.
 */
const makeNonLocalizedStrapi = (uid: string): Core.Strapi =>
  ({
    get: jest.fn(() => ({ get: jest.fn(() => undefined) })),
    contentTypes: {
      [uid]: {
        pluginOptions: {},
      },
    },
  }) as unknown as Core.Strapi;

// Locale schema + handler locale branches (F3: permissionChecker injected via resolvePermittedLocaleSchema)
describe('locale permission segregation', () => {
  const uid = 'api::article.article';
  // Use a model with at least one scalar attribute so sort/filters schemas don't produce z.never()
  const model = baseModel({
    uid,
    attributes: { title: { type: 'string' } } as TestAttrs,
  });
  const localeCodes: [string, ...string[]] = ['en', 'fr', 'de'];
  const buildContext = { localeCodes, defaultLocale: 'en' };

  // Override the getService mock to return our locale-restricted checker per test
  const setupLocaleRestrictedService = (permittedLocales: string[]) => {
    const localeChecker = makeLocaleRestrictedPermissionChecker(permittedLocales);
    const { getService: mockedGetService } = jest.requireMock('../../utils') as {
      getService: jest.Mock;
    };
    mockedGetService.mockImplementation((name: string) => {
      if (name === 'permission-checker') {
        return { create: jest.fn(() => localeChecker) };
      }
      if (name === 'document-manager') return mockDocumentManager;
      if (name === 'document-metadata') return mockDocumentMetadata;
      if (name === 'populate-builder') return mockPopulateBuilder;
      throw new Error(`Unknown service: ${name}`);
    });
    return localeChecker;
  };

  afterEach(() => {
    // Restore the default mock after each test
    const { getService: mockedGetService } = jest.requireMock('../../utils') as {
      getService: jest.Mock;
    };
    mockedGetService.mockImplementation((name: string) => {
      if (name === 'permission-checker') {
        return { create: jest.fn(() => mockPermissionChecker) };
      }
      if (name === 'document-manager') return mockDocumentManager;
      if (name === 'document-metadata') return mockDocumentMetadata;
      if (name === 'populate-builder') return mockPopulateBuilder;
      throw new Error(`Unknown service: ${name}`);
    });
  });

  it('uses locale enum when localeCodes are provided in build context', () => {
    setupLocaleRestrictedService(['en', 'fr']);
    const localizedStrapi = makeLocalizedStrapi(uid);
    const toolsWithLocales = deriveDisplayedContentTypeMcpToolDefinitions(
      localizedStrapi,
      [model],
      { localeCodes: ['en', 'fr'], defaultLocale: 'en' }
    );
    const getTool = toolsWithLocales.find((t) => t.name === 'get_article')!;
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const getSchema = getTool.resolveInputSchema(context);
    expect(getSchema.safeParse({ documentId: 'abc', locale: 'en' }).success).toBe(true);
    expect(getSchema.safeParse({ documentId: 'abc', locale: 'de' }).success).toBe(false);
  });

  it('applies Zod default to locale when defaultLocale is known and in localeCodes', () => {
    setupLocaleRestrictedService(['en', 'fr']);
    const localizedStrapi = makeLocalizedStrapi(uid);
    const toolsWithLocales = deriveDisplayedContentTypeMcpToolDefinitions(
      localizedStrapi,
      [model],
      { localeCodes: ['en', 'fr'], defaultLocale: 'en' }
    );
    const getTool = toolsWithLocales.find((t) => t.name === 'get_article')!;
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const getSchema = getTool.resolveInputSchema(context);
    const parsed = getSchema.parse({ documentId: 'abc' });
    expect(parsed.locale).toBe('en');
  });

  it('narrows locale enum for a localized CT when some locales are restricted', () => {
    setupLocaleRestrictedService(['en', 'fr']);
    const localizedStrapi = makeLocalizedStrapi(uid);
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(
      localizedStrapi,
      [model],
      buildContext
    );
    const listTool = tools.find((t) => t.name === 'list_article')!;
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const schema = listTool.resolveInputSchema(context);
    expect(schema.safeParse({ locale: 'en' }).success).toBe(true);
    expect(schema.safeParse({ locale: 'fr' }).success).toBe(true);
    expect(schema.safeParse({ locale: 'de' }).success).toBe(false);
  });

  it('does not apply Zod default when defaultLocale is not in the permitted set', () => {
    setupLocaleRestrictedService(['fr']);
    const localizedStrapi = makeLocalizedStrapi(uid);
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(
      localizedStrapi,
      [model],
      buildContext
    );
    const listTool = tools.find((t) => t.name === 'list_article')!;
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const parsed = listTool.resolveInputSchema(context).parse({});
    expect(parsed.locale).toBeUndefined();
  });

  it('does not apply Zod default when defaultLocale is null', () => {
    const toolsWithLocales = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model], {
      localeCodes: ['en', 'fr'],
      defaultLocale: null,
    });
    const getTool = toolsWithLocales.find((t) => t.name === 'get_article')!;

    const parsed = getTool.resolveInputSchema(mockContext).parse({ documentId: 'abc' });
    expect(parsed.locale).toBeUndefined();
  });

  it('leaves locale schema unrestricted when all locales are permitted', () => {
    setupLocaleRestrictedService(['en', 'fr', 'de']);
    const localizedStrapi = makeLocalizedStrapi(uid);
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(
      localizedStrapi,
      [model],
      buildContext
    );
    const getTool = tools.find((t) => t.name === 'get_article')!;
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const schema = getTool.resolveInputSchema(context);
    expect(schema.safeParse({ documentId: 'abc', locale: 'en' }).success).toBe(true);
    expect(schema.safeParse({ documentId: 'abc', locale: 'fr' }).success).toBe(true);
    expect(schema.safeParse({ documentId: 'abc', locale: 'de' }).success).toBe(true);
  });

  it('produces z.never().optional() when no locales are permitted', () => {
    setupLocaleRestrictedService([]);
    const localizedStrapi = makeLocalizedStrapi(uid);
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(
      localizedStrapi,
      [model],
      buildContext
    );
    const listTool = tools.find((t) => t.name === 'list_article')!;
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const schema = listTool.resolveInputSchema(context);
    // locale field should reject every value when no locales permitted
    expect(schema.safeParse({ locale: 'en' }).success).toBe(false);
    expect(schema.safeParse({ locale: 'fr' }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(true); // locale omitted is fine (optional)
  });

  it('does not restrict locale schema for non-localized content types', () => {
    setupLocaleRestrictedService(['en']);
    const nonLocalizedStrapi = makeNonLocalizedStrapi(uid);
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(
      nonLocalizedStrapi,
      [model],
      buildContext
    );
    const listTool = tools.find((t) => t.name === 'list_article')!;
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const schema = listTool.resolveInputSchema(context);
    // All locales accepted — no restriction on non-localized CT
    expect(schema.safeParse({ locale: 'en' }).success).toBe(true);
    expect(schema.safeParse({ locale: 'fr' }).success).toBe(true);
    expect(schema.safeParse({ locale: 'de' }).success).toBe(true);
  });

  it('applies different locale restrictions per action (read vs create)', () => {
    // Use a checker whose permitted locales depend on the action:
    //   read  → en, fr permitted
    //   create → en only
    const { getService: mockedGetService } = jest.requireMock('../../utils') as {
      getService: jest.Mock;
    };

    const permittedByAction: Record<string, string[]> = {
      'plugin::content-manager.explorer.read': ['en', 'fr'],
      'plugin::content-manager.explorer.create': ['en'],
    };

    const mixedChecker = {
      cannot: jest.fn((action: string, entity?: { locale?: string }) => {
        if (entity !== undefined && entity.locale !== undefined) {
          const allowed = permittedByAction[action] ?? [];
          return allowed.includes(entity.locale) === false;
        }
        return false;
      }) as jest.Mock & {
        read: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        publish: jest.Mock;
        unpublish: jest.Mock;
        discard: jest.Mock;
      },
      can: { read: jest.fn(() => true), create: jest.fn(() => true), update: jest.fn(() => true) },
      sanitizeOutput: jest.fn((doc: unknown) => Promise.resolve(doc)),
      sanitizeCreateInput: jest.fn((data: unknown) => Promise.resolve(data)),
      sanitizeUpdateInput: jest.fn(() => jest.fn((data: unknown) => Promise.resolve(data))),
      sanitizedQuery: {
        read: jest.fn((q: unknown) => Promise.resolve(q)),
        update: jest.fn((q: unknown) => Promise.resolve(q)),
        delete: jest.fn((q: unknown) => Promise.resolve(q)),
        publish: jest.fn((q: unknown) => Promise.resolve(q)),
        unpublish: jest.fn((q: unknown) => Promise.resolve(q)),
        discard: jest.fn((q: unknown) => Promise.resolve(q)),
      },
      requiresEntity: { read: jest.fn(() => false) },
    };

    mixedChecker.cannot.read = jest.fn(() => false);
    mixedChecker.cannot.create = jest.fn(() => false);
    mixedChecker.cannot.update = jest.fn(() => false);
    mixedChecker.cannot.delete = jest.fn(() => false);
    mixedChecker.cannot.publish = jest.fn(() => false);
    mixedChecker.cannot.unpublish = jest.fn(() => false);
    mixedChecker.cannot.discard = jest.fn(() => false);

    mockedGetService.mockImplementation((name: string) => {
      if (name === 'permission-checker') {
        return { create: jest.fn(() => mixedChecker) };
      }
      if (name === 'document-manager') return mockDocumentManager;
      if (name === 'document-metadata') return mockDocumentMetadata;
      if (name === 'populate-builder') return mockPopulateBuilder;
      throw new Error(`Unknown service: ${name}`);
    });

    const localizedStrapi = makeLocalizedStrapi(uid);
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(
      localizedStrapi,
      [model],
      buildContext
    );
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const listTool = tools.find((t) => t.name === 'list_article')!;
    const createTool = tools.find((t) => t.name === 'create_article')!;

    const listSchema = listTool.resolveInputSchema(context);
    expect(listSchema.safeParse({ locale: 'fr' }).success).toBe(true);
    expect(listSchema.safeParse({ locale: 'de' }).success).toBe(false);

    const createSchema = createTool.resolveInputSchema(context);
    expect(createSchema.safeParse({ data: {}, locale: 'en' }).success).toBe(true);
    expect(createSchema.safeParse({ data: {}, locale: 'fr' }).success).toBe(false);
  });

  it('passes the base locale schema through when localeCodes is null (i18n not installed)', () => {
    setupLocaleRestrictedService(['en']);
    const localizedStrapi = makeLocalizedStrapi(uid);
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(localizedStrapi, [model], {
      localeCodes: null,
      defaultLocale: null,
    });
    const listTool = tools.find((t) => t.name === 'list_article')!;
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const schema = listTool.resolveInputSchema(context);
    // With no localeCodes, falls back to generic string — any locale string valid
    expect(schema.safeParse({ locale: 'de' }).success).toBe(true);
    expect(schema.safeParse({ locale: 'xx' }).success).toBe(true);
  });

  it('non-localized CT with i18n installed: locale schema accepts any string and has no default', () => {
    const nonLocalizedStrapi = makeNonLocalizedStrapi(uid);
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(nonLocalizedStrapi, [model], {
      localeCodes: ['en', 'fr-FR', 'es-ES'],
      defaultLocale: 'en',
    });
    const deleteTool = tools.find((t) => t.name === 'delete_article')!;
    const context = { userAbility: makeUserAbility(), user: mockUser };

    const schema = deleteTool.resolveInputSchema(context);
    // Must accept any string (no enum restriction)
    expect(schema.safeParse({ documentId: 'abc', locale: 'en' }).success).toBe(true);
    expect(schema.safeParse({ documentId: 'abc', locale: 'xx-UNKNOWN' }).success).toBe(true);
    // Must NOT inject a default locale
    const parsed = schema.parse({ documentId: 'abc' });
    expect(parsed.locale).toBeUndefined();
  });
});

describe('collection-type handler: delete on non-localized CT', () => {
  const uid = 'api::article.article';
  const model = baseModel({ uid, attributes: { title: { type: 'string' } } as TestAttrs });

  const nonLocalizedStrapi = makeNonLocalizedStrapi(uid);
  const localizedStrapi = makeLocalizedStrapi(uid);
  const context = { userAbility: makeUserAbility(), user: mockUser };

  const tools = deriveDisplayedContentTypeMcpToolDefinitions(nonLocalizedStrapi, [model]);
  const deleteTool = tools.find((t) => t.name === 'delete_article')!;

  beforeEach(() => jest.clearAllMocks());

  it('calls findLocales without locale when content type is not localized', async () => {
    mockDocumentManager.findLocales.mockResolvedValueOnce([{ documentId: 'doc-1' }]);
    const handler = deleteTool.createHandler(nonLocalizedStrapi, context);
    await handler({ args: { documentId: 'doc-1' }, extra: mockExtra });

    expect(mockDocumentManager.findLocales).toHaveBeenCalledWith(
      'doc-1',
      uid,
      expect.objectContaining({ locale: undefined })
    );
    expect(mockDocumentManager.delete).toHaveBeenCalledWith(
      'doc-1',
      uid,
      expect.objectContaining({ locale: undefined })
    );
  });

  it('calls findLocales with locale when content type IS localized', async () => {
    const localizedTools = deriveDisplayedContentTypeMcpToolDefinitions(localizedStrapi, [model]);
    const localizedDeleteTool = localizedTools.find((t) => t.name === 'delete_article')!;

    mockDocumentManager.findLocales.mockResolvedValueOnce([{ documentId: 'doc-1' }]);
    const handler = localizedDeleteTool.createHandler(localizedStrapi, context);
    await handler({ args: { documentId: 'doc-1', locale: 'fr' }, extra: mockExtra });

    expect(mockDocumentManager.findLocales).toHaveBeenCalledWith(
      'doc-1',
      uid,
      expect.objectContaining({ locale: 'fr' })
    );
  });

  it('succeeds (does not throw NotFoundError) when findLocales returns result for non-localized CT', async () => {
    mockDocumentManager.findLocales.mockResolvedValueOnce([{ documentId: 'doc-1' }]);
    const handler = deleteTool.createHandler(nonLocalizedStrapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1' }, extra: mockExtra })
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Additional handler tests — collection-type
// ---------------------------------------------------------------------------

const makeStrapiWithDb = (overrides: Record<string, unknown> = {}): Core.Strapi =>
  ({
    getModel: jest.fn(() => ({})),
    db: {
      transaction: jest.fn(async (cb: () => Promise<unknown>) => cb()),
      query: jest.fn(() => ({
        findOne: jest.fn(() => Promise.resolve(null)),
      })),
    },
    contentTypes: {},
    plugins: {},
    apis: {},
    admin: { services: {} },
    ...overrides,
  }) as unknown as Core.Strapi;

describe('collection-type handler: update', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ options: { draftAndPublish: true } }),
  ]);
  const updateTool = tools.find((t) => t.name === 'update_article')!;
  const strapi = makeStrapiWithDb();
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundError when document does not exist', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce(null);
    mockDocumentManager.exists.mockResolvedValueOnce(false);

    const handler = updateTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'missing', data: {}, locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Document not found');
  });

  it('creates new locale when document exists but locale version is missing', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce(null);
    mockDocumentManager.exists.mockResolvedValueOnce(true);
    mockDocumentManager.update.mockResolvedValueOnce({ documentId: 'doc-1', title: 'New locale' });

    const handler = updateTool.createHandler(strapi, context);
    const result = await handler({
      args: { documentId: 'doc-1', data: { title: 'New locale' }, locale: 'fr' },
      extra: mockExtra,
    });

    expect(result.isError).toBeUndefined();
    expect(mockDocumentManager.update).toHaveBeenCalled();
    expect(mockPermissionChecker.sanitizeCreateInput).toHaveBeenCalled();
    expect(mockSetCreatorFields).toHaveBeenCalledWith({ user: mockUser, isEdition: false });
  });

  it('throws ForbiddenError when document exists, locale exists, but entity update is forbidden', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });
    mockDocumentManager.exists.mockResolvedValueOnce(true);
    mockPermissionChecker.cannot.update
      .mockReturnValueOnce(false) // global: pass
      .mockReturnValueOnce(true); // entity: fail

    const handler = updateTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1', data: {}, locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
  });

  it('throws ForbiddenError when locale missing and create is forbidden', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce(null);
    mockDocumentManager.exists.mockResolvedValueOnce(true);
    mockPermissionChecker.cannot.create.mockReturnValueOnce(true);

    const handler = updateTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1', data: {}, locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
  });

  it('returns formatted document on success', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1', title: 'Original' });
    mockDocumentManager.exists.mockResolvedValueOnce(true);
    mockDocumentManager.update.mockResolvedValueOnce({ documentId: 'doc-1', title: 'Updated' });

    const handler = updateTool.createHandler(strapi, context);
    const result = await handler({
      args: { documentId: 'doc-1', data: { title: 'Updated' }, locale: 'en' },
      extra: mockExtra,
    });

    expect(result.structuredContent).toMatchObject({
      data: expect.objectContaining({ documentId: 'doc-1' }),
    });
    expect(mockDocumentManager.update).toHaveBeenCalled();
    expect(mockSetCreatorFields).toHaveBeenCalledWith({ user: mockUser, isEdition: true });
  });
});

describe('collection-type handler: publish', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ options: { draftAndPublish: true } }),
  ]);
  const publishTool = tools.find((t) => t.name === 'publish_article')!;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundError when document does not exist', async () => {
    mockDocumentManager.exists.mockResolvedValueOnce(false);

    const strapi = makeStrapiWithDb();
    const handler = publishTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'missing', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Document not found');
  });

  it('throws NotFoundError when draft locale is missing', async () => {
    mockDocumentManager.exists.mockResolvedValueOnce(true);
    mockDocumentManager.findOne.mockResolvedValueOnce(null);

    const strapi = makeStrapiWithDb();
    const handler = publishTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1', locale: 'fr' }, extra: mockExtra })
    ).rejects.toThrow('Document locale not found');
  });

  it('throws ForbiddenError when entity publish is forbidden', async () => {
    mockDocumentManager.exists.mockResolvedValueOnce(true);
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });
    mockPermissionChecker.cannot.publish
      .mockReturnValueOnce(false) // global: pass
      .mockReturnValueOnce(true); // entity: fail

    const strapi = makeStrapiWithDb();
    const handler = publishTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
  });

  it('returns published document on success', async () => {
    mockDocumentManager.exists.mockResolvedValueOnce(true);
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });
    mockDocumentManager.publish.mockResolvedValueOnce([
      { documentId: 'doc-1', publishedAt: '2026-01-01' },
    ]);

    const strapi = makeStrapiWithDb();
    const handler = publishTool.createHandler(strapi, context);
    const result = await handler({
      args: { documentId: 'doc-1', locale: 'en' },
      extra: mockExtra,
    });

    expect(result.structuredContent).toMatchObject({
      data: expect.objectContaining({ documentId: 'doc-1' }),
    });
    expect(mockDocumentManager.publish).toHaveBeenCalledWith(
      'doc-1',
      'api::article.article',
      expect.objectContaining({ locale: 'en' })
    );
  });
});

describe('collection-type handler: unpublish', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ options: { draftAndPublish: true } }),
  ]);
  const unpublishTool = tools.find((t) => t.name === 'unpublish_article')!;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundError when no published document is found', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce(null);

    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'missing', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Document not found');
  });

  it('throws ForbiddenError when global unpublish is forbidden', async () => {
    mockPermissionChecker.cannot.unpublish.mockReturnValueOnce(true);

    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
  });

  it('throws ForbiddenError when discardDraft=true but discard permission is missing', async () => {
    mockPermissionChecker.cannot.discard.mockReturnValueOnce(true);

    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1', discardDraft: true, locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
    // Fails before document lookup
    expect(mockDocumentManager.findOne).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when entity unpublish is forbidden', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });
    mockPermissionChecker.cannot.unpublish
      .mockReturnValueOnce(false) // global
      .mockReturnValueOnce(true); // entity

    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
  });

  it('throws ForbiddenError when discardDraft=true but entity discard is forbidden', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });
    mockPermissionChecker.cannot.discard
      .mockReturnValueOnce(false) // global
      .mockReturnValueOnce(true); // entity

    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1', discardDraft: true, locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
  });

  it('unpublishes without discarding draft when discardDraft is false', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });
    mockDocumentManager.unpublish.mockResolvedValueOnce({ documentId: 'doc-1' });

    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    await handler({ args: { documentId: 'doc-1', locale: 'en' }, extra: mockExtra });

    expect(mockDocumentManager.unpublish).toHaveBeenCalled();
    expect(mockDocumentManager.discardDraft).not.toHaveBeenCalled();
  });

  it('discards draft before unpublishing when discardDraft=true', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });

    const discardOrder: string[] = [];
    mockDocumentManager.discardDraft.mockImplementation(async () => {
      discardOrder.push('discard');
      return { documentId: 'doc-1' };
    });
    mockDocumentManager.unpublish.mockImplementation(async () => {
      discardOrder.push('unpublish');
      return { documentId: 'doc-1' };
    });

    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    await handler({
      args: { documentId: 'doc-1', discardDraft: true, locale: 'en' },
      extra: mockExtra,
    });

    expect(discardOrder[0]).toBe('discard');
    expect(discardOrder[1]).toBe('unpublish');
  });
});

describe('collection-type handler: discard_draft', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ options: { draftAndPublish: true } }),
  ]);
  const discardTool = tools.find((t) => t.name === 'discard_article_draft')!;
  const strapi = {} as unknown as Core.Strapi;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundError when no published document found', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce(null);

    const handler = discardTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'missing', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Document not found');
  });

  it('throws ForbiddenError when entity discard is forbidden', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });
    mockPermissionChecker.cannot.discard
      .mockReturnValueOnce(false) // global
      .mockReturnValueOnce(true); // entity

    const handler = discardTool.createHandler(strapi, context);
    await expect(
      handler({ args: { documentId: 'doc-1', locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
  });

  it('discards draft and returns result on success', async () => {
    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });
    mockDocumentManager.discardDraft.mockResolvedValueOnce({ documentId: 'doc-1' });

    const handler = discardTool.createHandler(strapi, context);
    const result = await handler({
      args: { documentId: 'doc-1', locale: 'en' },
      extra: mockExtra,
    });

    expect(mockDocumentManager.discardDraft).toHaveBeenCalledWith(
      'doc-1',
      'api::article.article',
      expect.objectContaining({ locale: 'en' })
    );
    expect(result.structuredContent).toBeDefined();
  });
});

describe('single-type handler: create/update (write)', () => {
  const uid = 'api::global.global';
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ kind: 'singleType', uid, apiID: 'global', options: { draftAndPublish: true } }),
  ]);
  const writeTool = () => tools.find((t) => t.name === 'write_global')!;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeStrapiForWrite = (findOneResult: unknown) => {
    const dbQueryFindOne = jest.fn(() => Promise.resolve(findOneResult));
    const strapi = makeStrapiWithDb({
      db: {
        transaction: jest.fn(async (cb: () => Promise<unknown>) => cb()),
        query: jest.fn(() => ({ findOne: dbQueryFindOne })),
      },
    });
    return { strapi, dbQueryFindOne };
  };

  it('create branch — calls documentManager.create when no existing document', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([]);
    mockDocumentManager.create.mockResolvedValueOnce({ documentId: 'new-1' });
    const { strapi } = makeStrapiForWrite(null);

    const handler = writeTool().createHandler(strapi, context);
    await handler({ args: { data: { title: 'New' }, locale: 'en' }, extra: mockExtra });

    expect(mockDocumentManager.create).toHaveBeenCalled();
    expect(mockDocumentManager.update).not.toHaveBeenCalled();
  });

  it('update branch — calls documentManager.update when existing document with draft version', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([{ documentId: 'st-1', title: 'old' }]);
    mockDocumentManager.update.mockResolvedValueOnce({ documentId: 'st-1', title: 'new' });
    const { strapi } = makeStrapiForWrite({ documentId: 'st-1' });

    const handler = writeTool().createHandler(strapi, context);
    await handler({ args: { data: { title: 'new' }, locale: 'en' }, extra: mockExtra });

    expect(mockDocumentManager.update).toHaveBeenCalled();
    expect(mockDocumentManager.create).not.toHaveBeenCalled();
    expect(mockSetCreatorFields).toHaveBeenCalledWith({ user: mockUser, isEdition: true });
  });

  it('update branch — uses existing documentId when draft version missing (new locale)', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([]);
    mockDocumentManager.update.mockResolvedValueOnce({ documentId: 'st-1' });
    const { strapi } = makeStrapiForWrite({ documentId: 'st-1' });

    const handler = writeTool().createHandler(strapi, context);
    await handler({ args: { data: {}, locale: 'fr' }, extra: mockExtra });

    expect(mockDocumentManager.update).toHaveBeenCalled();
    expect(mockSetCreatorFields).toHaveBeenCalledWith({ user: mockUser, isEdition: false });
  });

  it('throws ForbiddenError when both create and update are forbidden', async () => {
    mockPermissionChecker.cannot.create.mockReturnValueOnce(true);
    mockPermissionChecker.cannot.update.mockReturnValueOnce(true);
    const { strapi } = makeStrapiForWrite(null);

    const handler = writeTool().createHandler(strapi, context);
    await expect(handler({ args: { data: {} }, extra: mockExtra })).rejects.toThrow('Forbidden');
  });

  it('throws ForbiddenError when entity update is forbidden', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([{ documentId: 'st-1' }]);
    // cannot.create() returns false (default), so cannot.update() in combined check is short-circuited
    // The only call is the entity-level check: cannot.update(documentVersion)
    mockPermissionChecker.cannot.update.mockReturnValueOnce(true); // entity: fail
    const { strapi } = makeStrapiForWrite({ documentId: 'st-1' });

    const handler = writeTool().createHandler(strapi, context);
    await expect(handler({ args: { data: {} }, extra: mockExtra })).rejects.toThrow('Forbidden');
  });

  it('throws ForbiddenError when version missing and create is forbidden', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([]);
    mockPermissionChecker.cannot.create
      .mockReturnValueOnce(false) // combined initial check (passes because update also passes)
      .mockReturnValueOnce(true); // version-missing branch
    const { strapi } = makeStrapiForWrite({ documentId: 'st-1' });

    const handler = writeTool().createHandler(strapi, context);
    await expect(handler({ args: { data: {}, locale: 'fr' }, extra: mockExtra })).rejects.toThrow(
      'Forbidden'
    );
  });
});

describe('single-type handler: publish', () => {
  const uid = 'api::global.global';
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ kind: 'singleType', uid, apiID: 'global', options: { draftAndPublish: true } }),
  ]);
  const publishTool = tools.find((t) => t.name === 'publish_global')!;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundError when no draft document found', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([]);
    const strapi = makeStrapiWithDb();
    const handler = publishTool.createHandler(strapi, context);
    await expect(handler({ args: { locale: 'en' }, extra: mockExtra })).rejects.toThrow(
      'Document not found'
    );
  });

  it('throws ForbiddenError when entity publish is forbidden', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([{ documentId: 'st-1' }]);
    mockPermissionChecker.cannot.publish
      .mockReturnValueOnce(false) // global
      .mockReturnValueOnce(true); // entity

    const strapi = makeStrapiWithDb();
    const handler = publishTool.createHandler(strapi, context);
    await expect(handler({ args: { locale: 'en' }, extra: mockExtra })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('returns published document on success', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([{ documentId: 'st-1' }]);
    mockDocumentManager.publish.mockResolvedValueOnce([
      { documentId: 'st-1', publishedAt: '2026-01-01' },
    ]);

    const strapi = makeStrapiWithDb();
    const handler = publishTool.createHandler(strapi, context);
    const result = await handler({ args: { locale: 'en' }, extra: mockExtra });

    expect(mockDocumentManager.publish).toHaveBeenCalledWith(
      'st-1',
      uid,
      expect.objectContaining({ locale: 'en' })
    );
    expect(result.structuredContent).toMatchObject({ data: expect.anything() });
  });
});

describe('single-type handler: unpublish', () => {
  const uid = 'api::global.global';
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ kind: 'singleType', uid, apiID: 'global', options: { draftAndPublish: true } }),
  ]);
  const unpublishTool = tools.find((t) => t.name === 'unpublish_global')!;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundError when no document is found', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([]);
    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    await expect(handler({ args: { locale: 'en' }, extra: mockExtra })).rejects.toThrow(
      'Document not found'
    );
  });

  it('throws ForbiddenError when discardDraft permission is missing', async () => {
    mockPermissionChecker.cannot.discard.mockReturnValueOnce(true);
    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    await expect(
      handler({ args: { discardDraft: true, locale: 'en' }, extra: mockExtra })
    ).rejects.toThrow('Forbidden');
  });

  it('unpublishes successfully and returns transaction result directly', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([{ documentId: 'st-1' }]);
    mockDocumentManager.unpublish.mockResolvedValueOnce({ documentId: 'st-1' });

    const strapi = makeStrapiWithDb();
    const handler = unpublishTool.createHandler(strapi, context);
    const result = await handler({ args: { locale: 'en' }, extra: mockExtra });

    expect(mockDocumentManager.unpublish).toHaveBeenCalled();
    expect(mockDocumentManager.findMany).toHaveBeenCalledTimes(1);
    expect(result.isError).toBeUndefined();
  });
});

describe('single-type handler: discard_draft', () => {
  const uid = 'api::global.global';
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ kind: 'singleType', uid, apiID: 'global', options: { draftAndPublish: true } }),
  ]);
  const discardTool = tools.find((t) => t.name === 'discard_global_draft')!;
  const strapi = {} as unknown as Core.Strapi;
  const context = { userAbility: makeUserAbility(), user: mockUser };

  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundError when no published document found', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([]);
    const handler = discardTool.createHandler(strapi, context);
    await expect(handler({ args: { locale: 'en' }, extra: mockExtra })).rejects.toThrow(
      'Document not found'
    );
  });

  it('throws ForbiddenError when entity discard is forbidden', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([{ documentId: 'st-1' }]);
    mockPermissionChecker.cannot.discard
      .mockReturnValueOnce(false) // global
      .mockReturnValueOnce(true); // entity

    const handler = discardTool.createHandler(strapi, context);
    await expect(handler({ args: { locale: 'en' }, extra: mockExtra })).rejects.toThrow(
      'Forbidden'
    );
  });

  it('discards draft and returns result on success', async () => {
    mockDocumentManager.findMany.mockResolvedValueOnce([{ documentId: 'st-1' }]);
    mockDocumentManager.discardDraft.mockResolvedValueOnce({ documentId: 'st-1' });

    const handler = discardTool.createHandler(strapi, context);
    const result = await handler({ args: { locale: 'en' }, extra: mockExtra });

    expect(mockDocumentManager.discardDraft).toHaveBeenCalledWith(
      'st-1',
      uid,
      expect.objectContaining({ locale: 'en' })
    );
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Phase 3 — Component permission schema tightening (F4 partial, F7)
// ---------------------------------------------------------------------------

describe('schema: component permission narrowing — current behavior', () => {
  const attrs = {
    title: { type: 'string' },
    SEO: { type: 'component', component: 'shared.seo' },
  } as TestAttrs;
  const model = baseModel({ uid: 'api::article.article', attributes: attrs });
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
  const createTool = tools.find((t) => t.name === 'create_article')!;

  it('includes entire component when at least one nested leaf is permitted', () => {
    // Regular admin: only SEO.title in CASL rules — but whole component is exposed
    // TODO @Nico Phase 3: tighten schema to SEO.title only; reject SEO.description and SEO.url via Zod
    const ability = makeFieldRestrictedAbility(['title', 'SEO.title']);
    const context = { userAbility: ability, user: mockUser };

    const inputSchema = createTool.resolveInputSchema(context);
    // Whole SEO component accepted (current behavior — whole component exposed)
    expect(
      inputSchema.safeParse({ data: { SEO: { title: 'a', description: 'b', url: 'c' } } }).success
    ).toBe(true);
    expect(inputSchema.safeParse({ data: { SEO: { title: 'a' } } }).success).toBe(true);
  });

  it('excludes component when zero nested leaves are permitted', () => {
    const permitted = new Set(['title']);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _actual = jest.requireActual(
      '../derive-content-type-mcp-tools'
    ) as typeof import('../derive-content-type-mcp-tools');
    const schema = buildDataSchema(mockStrapi, model, attrs, permitted);
    // SEO is excluded — no SEO.* paths in permitted set
    expect(schema.safeParse({ title: 'hello' }).success).toBe(true);
    expect(schema.safeParse({ title: 'hello', SEO: {} }).success).toBe(false);
  });

  it('resolves nested component paths correctly for permission checks', () => {
    // nested.label and nested.inner.title are permitted → whole nested component exposed
    // TODO @Nico Phase 3: tighten schema to nested.label + nested.inner.title only; reject inner.description/url
    const ability = makeFieldRestrictedAbility(['nested.label', 'nested.inner.title']);
    const context = { userAbility: ability, user: mockUser };

    const nestedAttrs = {
      nested: { type: 'component', component: 'shared.nested' },
    } as TestAttrs;
    const nestedModel = baseModel({ uid: 'api::article.article', attributes: nestedAttrs });
    const nestedTools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [nestedModel]);
    const nestedCreateTool = nestedTools.find((t) => t.name === 'create_article')!;

    const inputSchema = nestedCreateTool.resolveInputSchema(context);
    // nested component present
    expect(inputSchema.safeParse({ data: { nested: { label: 'hi' } } }).success).toBe(true);
    // inner sub-component also fully exposed (current behavior)
    expect(
      inputSchema.safeParse({
        data: { nested: { label: 'hi', inner: { title: 't', description: 'd', url: '/u' } } },
      }).success
    ).toBe(true);
  });
});

// Phase 1 — publish tool schema/description contract (existing draft only)
describe('schema: publish tool behavior contract', () => {
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [
    baseModel({ options: { draftAndPublish: true } }),
  ]);

  it('publish tool description mentions existing document and documentId', () => {
    const publishTool = tools.find((t) => t.name === 'publish_article')!;
    expect(publishTool.description).toContain('documentId');
    expect(publishTool.description.toLowerCase()).toContain('existing');
  });
});

// ---------------------------------------------------------------------------
// Phase 1 — Handler contract tests (locale edge cases, pre-existing)
// ---------------------------------------------------------------------------

describe('single-type handler: delete on non-localized CT', () => {
  const uid = 'api::global.global';
  const model = baseModel({
    uid,
    kind: 'singleType',
    apiID: 'global',
    attributes: { title: { type: 'string' } } as TestAttrs,
  });

  const nonLocalizedStrapi = makeNonLocalizedStrapi(uid);
  const localizedStrapi = makeLocalizedStrapi(uid);
  const context = { userAbility: makeUserAbility(), user: mockUser };

  const tools = deriveDisplayedContentTypeMcpToolDefinitions(nonLocalizedStrapi, [model]);
  const deleteTool = tools.find((t) => t.name === 'delete_global')!;

  beforeEach(() => jest.clearAllMocks());

  it('calls findLocales without locale when content type is not localized', async () => {
    mockDocumentManager.findLocales.mockResolvedValueOnce([{ documentId: 'doc-1' }]);
    const handler = deleteTool.createHandler(nonLocalizedStrapi, context);
    await handler({ args: {}, extra: mockExtra });

    expect(mockDocumentManager.findLocales).toHaveBeenCalledWith(
      undefined,
      uid,
      expect.objectContaining({ locale: undefined })
    );
    expect(mockDocumentManager.delete).toHaveBeenCalledWith(
      'doc-1',
      uid,
      expect.objectContaining({ locale: undefined })
    );
  });

  it('calls findLocales with locale when content type IS localized', async () => {
    const localizedTools = deriveDisplayedContentTypeMcpToolDefinitions(localizedStrapi, [model]);
    const localizedDeleteTool = localizedTools.find((t) => t.name === 'delete_global')!;

    mockDocumentManager.findLocales.mockResolvedValueOnce([{ documentId: 'doc-1' }]);
    const handler = localizedDeleteTool.createHandler(localizedStrapi, context);
    await handler({ args: { locale: 'fr' }, extra: mockExtra });

    expect(mockDocumentManager.findLocales).toHaveBeenCalledWith(
      undefined,
      uid,
      expect.objectContaining({ locale: 'fr' })
    );
  });
});

describe('relation populate: read handlers call populateDeep and withPopulateOverride', () => {
  const uid = 'api::article.article';
  const model = baseModel({ uid, attributes: { title: { type: 'string' } } as TestAttrs });
  const context = { userAbility: makeUserAbility(), user: mockUser };
  // Needs getModel for hasDraftAndPublish in list handler
  const strapiForTest = makeMinimalGlobalStrapi();

  const getBuilderFromMock = () => {
    const { getService } = jest.requireMock('../../utils') as { getService: jest.Mock };
    return getService('populate-builder')();
  };

  beforeEach(() => jest.clearAllMocks());

  it('list_* calls populateDeep and withPopulateOverride, not countRelations', async () => {
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const listTool = tools.find((t) => t.name === 'list_article')!;
    const handler = listTool.createHandler(strapiForTest, context);
    await handler({ args: {}, extra: mockExtra });

    const builder = getBuilderFromMock();
    expect(builder.populateDeep).toHaveBeenCalled();
    expect(builder.withPopulateOverride).toHaveBeenCalled();
    expect(builder.countRelations).not.toHaveBeenCalled();
  });

  it('get_* calls populateDeep and withPopulateOverride, not countRelations', async () => {
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const getTool = tools.find((t) => t.name === 'get_article')!;

    mockDocumentManager.findOne.mockResolvedValueOnce({ documentId: 'doc-1' });
    const handler = getTool.createHandler(strapiForTest, context);
    await handler({ args: { documentId: 'doc-1' }, extra: mockExtra });

    const builder = getBuilderFromMock();
    expect(builder.populateDeep).toHaveBeenCalled();
    expect(builder.withPopulateOverride).toHaveBeenCalled();
    expect(builder.countRelations).not.toHaveBeenCalled();
  });
});

describe('relation identity: shapeRelationsForMcp called on every op', () => {
  const { shapeRelationsForMcp: mockShapeRelations } = jest.requireMock(
    '../sanitizers/shape-relations'
  ) as { shapeRelationsForMcp: jest.Mock };

  const uid = 'api::article.article';
  const model = baseModel({
    uid,
    attributes: { title: { type: 'string' } } as TestAttrs,
    options: { draftAndPublish: true },
  });
  const context = { userAbility: makeUserAbility(), user: mockUser };
  const strapiForTest = makeMinimalGlobalStrapi();

  const runHandler = async (toolName: string, args: Record<string, unknown> = {}) => {
    jest.clearAllMocks();
    const tools = deriveDisplayedContentTypeMcpToolDefinitions(mockStrapi, [model]);
    const tool = tools.find((t) => t.name === toolName)!;
    const handler = tool.createHandler(strapiForTest, context);
    await handler({ args, extra: mockExtra });
    return mockShapeRelations;
  };

  beforeEach(() => {
    mockDocumentManager.findOne.mockResolvedValue({ documentId: 'doc-1' });
    mockDocumentManager.findMany.mockResolvedValue([{ documentId: 'doc-1' }]);
    mockDocumentManager.exists.mockResolvedValue(true);
    mockDocumentManager.publish.mockResolvedValue([{ documentId: 'doc-1' }]);
    mockDocumentManager.unpublish.mockResolvedValue({ documentId: 'doc-1' });
    mockDocumentManager.discardDraft.mockResolvedValue({ documentId: 'doc-1' });
  });

  it('list_article routes output through shapeRelationsForMcp', async () => {
    mockDocumentManager.findPage.mockResolvedValueOnce({
      results: [{ documentId: 'doc-1', category: { documentId: 'c1', name: 'LEAKED' } }],
      pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
    });
    const spy = await runHandler('list_article');
    expect(spy).toHaveBeenCalled();
  });

  it('get_article routes output through shapeRelationsForMcp', async () => {
    const spy = await runHandler('get_article', { documentId: 'doc-1' });
    expect(spy).toHaveBeenCalled();
  });

  it('create_article routes output through shapeRelationsForMcp', async () => {
    const spy = await runHandler('create_article', { data: { title: 'New' } });
    expect(spy).toHaveBeenCalled();
  });

  it('update_article routes output through shapeRelationsForMcp', async () => {
    const spy = await runHandler('update_article', { documentId: 'doc-1', data: { title: 'Up' } });
    expect(spy).toHaveBeenCalled();
  });

  it('publish_article routes output through shapeRelationsForMcp', async () => {
    const spy = await runHandler('publish_article', { documentId: 'doc-1' });
    expect(spy).toHaveBeenCalled();
  });

  it('unpublish_article routes output through shapeRelationsForMcp', async () => {
    const spy = await runHandler('unpublish_article', { documentId: 'doc-1' });
    expect(spy).toHaveBeenCalled();
  });

  it('discard_article_draft routes output through shapeRelationsForMcp', async () => {
    const spy = await runHandler('discard_article_draft', { documentId: 'doc-1' });
    expect(spy).toHaveBeenCalled();
  });
});
