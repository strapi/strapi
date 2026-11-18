import { getService } from '../../../utils';
import {
  createCollectionCreateHandler,
  createCollectionPublishHandler,
  createCollectionUnpublishHandler,
  createCollectionUpdateHandler,
} from '../collection-handlers';
import {
  createSinglePublishHandler,
  createSingleUnpublishHandler,
  singleCreateOrUpdate,
} from '../single-type-handlers';

jest.mock('../../../utils', () => ({
  getService: jest.fn(),
}));

jest.mock('../../../controllers/validation/dimensions', () => ({
  getDocumentLocaleAndStatus: jest.fn(async () => ({ locale: 'en', status: 'draft' })),
}));

jest.mock('../../../controllers/utils/metadata', () => ({
  formatDocumentWithMetadata: jest.fn(),
}));

jest.mock('../../../controllers/utils/document-status', () => ({
  indexByDocumentId: jest.fn(),
}));

jest.mock('../../../services/utils/populate', () => ({
  getPopulateForLocalizations: jest.fn(() => ({})),
}));

jest.mock('../../permissions', () => ({
  isContentTypeLocalized: jest.fn(() => false),
}));

jest.mock('../../sanitizers/shape-relations', () => ({
  shapeRelationsForMcp: jest.fn(async (_uid: unknown, data: unknown) => data),
}));

jest.mock('../../utils', () => ({
  ok: (value: unknown) => value,
  sanitizeFormatShape: jest.fn(async (_checker: unknown, _uid: unknown, doc: unknown) => doc),
}));

const COLLECTION_UID = 'api::article.article';
const SINGLE_UID = 'api::homepage.homepage';
const context = { userAbility: {}, user: { id: 1 } };

const builder = {
  populateFromQuery() {
    return builder;
  },
  populateDeep() {
    return builder;
  },
  withPopulateOverride() {
    return builder;
  },
  build: async () => ({}),
};

const permissionChecker = {
  cannot: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
    publish: () => false,
    unpublish: () => false,
    discard: () => false,
  },
  sanitizedQuery: {
    read: async () => ({}),
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    publish: async () => ({}),
    unpublish: async () => ({}),
  },
  sanitizeCreateInput: async (data: unknown) => data,
  sanitizeUpdateInput: () => async (data: unknown) => data,
  sanitizeOutput: async (data: unknown) => data,
};

type HarnessOptions = {
  dialect?: string;
  /** null means the single-type row does not exist yet */
  documentId?: string | null;
  findMany?: unknown[];
  findOne?: unknown;
  exists?: boolean;
};

const createHarness = ({
  dialect = 'mysql',
  documentId = 'doc-1',
  findMany = [{ documentId: 'doc-1' }],
  findOne = { documentId: 'doc-1' },
  exists = true,
}: HarnessOptions = {}) => {
  const sequence: string[] = [];
  const documentManager = {
    findOne: jest.fn(async () => {
      sequence.push('findOne');
      return findOne;
    }),
    exists: jest.fn(async () => {
      sequence.push('exists');
      return exists;
    }),
    findMany: jest.fn(async () => {
      sequence.push('findMany');
      return findMany;
    }),
    update: jest.fn(async () => {
      sequence.push('update');
      return { documentId: 'doc-1' };
    }),
    create: jest.fn(async () => {
      sequence.push('create');
      return { documentId: 'doc-new' };
    }),
    publish: jest.fn(async () => {
      sequence.push('publish');
      return [{ documentId: 'doc-1' }];
    }),
    unpublish: jest.fn(async () => {
      sequence.push('unpublish');
      return { documentId: 'doc-1' };
    }),
    discardDraft: jest.fn(async () => {
      sequence.push('discardDraft');
    }),
  };

  const strapi = {
    db: {
      dialect: { client: dialect },
      transaction: jest.fn(async (fn: () => Promise<unknown>) => {
        sequence.push('trx');
        return fn();
      }),
      lockDocumentId: jest.fn(async (id: string) => {
        sequence.push(`lock:${id}`);
      }),
      query: () => ({
        async findOne() {
          sequence.push('readDocumentId');
          return documentId === null ? null : { documentId };
        },
      }),
    },
  };

  jest.mocked(getService).mockImplementation(((name: string) => {
    if (name === 'document-manager') {
      return documentManager;
    }
    if (name === 'permission-checker') {
      return { create: () => permissionChecker };
    }
    if (name === 'populate-builder') {
      return () => builder;
    }
    throw new Error(`unexpected service ${name}`);
  }) as any);

  return { sequence, strapi };
};

describe('MCP document locks', () => {
  test('collection update locks the document before the write', async () => {
    const { sequence, strapi } = createHarness();
    const handler = createCollectionUpdateHandler(COLLECTION_UID as any)(
      strapi as any,
      context as any
    );

    await handler({ args: { documentId: 'doc-1', data: { title: 'next' } } });

    expect(sequence).toEqual(['findOne', 'exists', 'trx', 'lock:doc-1', 'update']);
  });

  test('collection update locks before inserting a locale that does not exist yet', async () => {
    const { sequence, strapi } = createHarness({ findOne: null });
    const handler = createCollectionUpdateHandler(COLLECTION_UID as any)(
      strapi as any,
      context as any
    );

    await handler({ args: { documentId: 'doc-1', data: { title: 'fr' }, locale: 'fr' } });

    expect(sequence).toEqual(['findOne', 'exists', 'trx', 'lock:doc-1', 'update']);
  });

  test('collection create has no document id to lock', async () => {
    const { sequence, strapi } = createHarness();
    const handler = createCollectionCreateHandler(COLLECTION_UID as any)(
      strapi as any,
      context as any
    );

    await handler({ args: { data: { title: 'new' } } });

    expect(sequence).toEqual(['trx', 'create']);
  });

  test('collection publish locks before it reads the draft', async () => {
    const { sequence, strapi } = createHarness();
    const handler = createCollectionPublishHandler(COLLECTION_UID as any)(
      strapi as any,
      context as any
    );

    await handler({ args: { documentId: 'doc-1' } });

    expect(sequence).toEqual(['trx', 'lock:doc-1', 'exists', 'findOne', 'publish']);
  });

  test('collection unpublish locks before discard and unpublish', async () => {
    const { sequence, strapi } = createHarness();
    const handler = createCollectionUnpublishHandler(COLLECTION_UID as any)(
      strapi as any,
      context as any
    );

    await handler({ args: { documentId: 'doc-1', discardDraft: true } });

    expect(sequence).toEqual(['findOne', 'trx', 'lock:doc-1', 'discardDraft', 'unpublish']);
  });

  test('single-type update reads the id outside the transaction, then locks first', async () => {
    const { sequence, strapi } = createHarness();

    await singleCreateOrUpdate(strapi as any, SINGLE_UID as any, context as any, {
      data: { title: 'next' },
    });

    expect(sequence).toEqual(['findMany', 'readDocumentId', 'trx', 'lock:doc-1', 'update']);
  });

  test('single-type create does not lock when the document does not exist yet', async () => {
    const { sequence, strapi } = createHarness({ documentId: null, findMany: [] });

    await singleCreateOrUpdate(strapi as any, SINGLE_UID as any, context as any, {
      data: { title: 'first' },
    });

    expect(sequence).toEqual(['findMany', 'readDocumentId', 'trx', 'create']);
  });

  test('single-type publish on MySQL reads the id before the transaction and locks first', async () => {
    const { sequence, strapi } = createHarness({ dialect: 'mysql' });
    const handler = createSinglePublishHandler(SINGLE_UID as any)(strapi as any, context as any);

    await handler({ args: {} });

    expect(sequence).toEqual(['readDocumentId', 'trx', 'lock:doc-1', 'findMany', 'publish']);
  });

  test('single-type publish on Postgres does not take the MySQL sentinel lock', async () => {
    const { sequence, strapi } = createHarness({ dialect: 'postgres' });
    const handler = createSinglePublishHandler(SINGLE_UID as any)(strapi as any, context as any);

    await handler({ args: {} });

    expect(sequence).toEqual(['trx', 'findMany', 'publish']);
  });

  test('single-type publish on MySQL does not lock when there is no document yet', async () => {
    const { sequence, strapi } = createHarness({ dialect: 'mysql', documentId: null });
    const handler = createSinglePublishHandler(SINGLE_UID as any)(strapi as any, context as any);

    await handler({ args: {} });

    expect(sequence).toEqual(['readDocumentId', 'trx', 'findMany', 'publish']);
  });

  test('single-type unpublish locks before discard and unpublish', async () => {
    const { sequence, strapi } = createHarness();
    const handler = createSingleUnpublishHandler(SINGLE_UID as any)(strapi as any, context as any);

    await handler({ args: { discardDraft: true } });

    expect(sequence).toEqual(['findMany', 'trx', 'lock:doc-1', 'discardDraft', 'unpublish']);
  });
});
