// @ts-expect-error - test helper
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import collectionTypes from '../collection-types';
import singleTypes from '../single-types';

jest.mock('../validation', () => ({
  validateBulkActionInput: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../validation/dimensions', () => ({
  getDocumentLocaleAndStatus: jest.fn().mockResolvedValue({ locale: 'en' }),
}));

jest.mock('../../services/utils/populate', () => ({
  ...jest.requireActual('../../services/utils/populate'),
  getPopulateForLocalizations: jest.fn(() => ({})),
  buildDeepPopulate: jest.fn().mockResolvedValue({ deep: true }),
}));

/**
 * Covers the document actions of the collection-type and single-type controllers: what they
 * forward to the document manager, and that each response goes through the permission
 * checker's output sanitizer and the metadata formatter.
 */

const model = 'api::article.article';
const user = { id: 1 };

// The output sanitizer drops this field, the input sanitizers this one
const SECRET = 'secret';
const NOT_PERMITTED = 'notPermitted';

const createPermissionChecker = () => {
  const allowed = () => jest.fn(() => true);
  const denied = () => jest.fn(() => false);
  const sanitizedQuery = jest.fn(async (query: any) => query);
  const pickPermitted = (data: any) => {
    const { [NOT_PERMITTED]: _, ...rest } = data;
    return rest;
  };

  return {
    can: {
      create: jest.fn((_entity: unknown, path?: string) => path !== 'title'),
      update: allowed(),
    },
    cannot: {
      create: denied(),
      update: denied(),
      delete: denied(),
      publish: denied(),
      read: denied(),
    },
    sanitizedQuery: {
      create: sanitizedQuery,
      update: sanitizedQuery,
      delete: sanitizedQuery,
      publish: sanitizedQuery,
      read: sanitizedQuery,
    },
    sanitizeOutput: jest.fn(async (data: any) => {
      if (data === null || data === undefined) {
        return data;
      }
      const { [SECRET]: _, ...rest } = data;
      return rest;
    }),
    sanitizeCreateInput: jest.fn(pickPermitted),
    sanitizeUpdateInput: jest.fn(() => pickPermitted),
  };
};

const createDocumentManager = () => ({
  findOne: jest.fn(),
  findMany: jest.fn(),
  findLocales: jest.fn(),
  exists: jest.fn().mockResolvedValue(true),
  create: jest.fn(async (_uid: string, { data }: any) => ({ documentId: 'new', ...data })),
  update: jest.fn(async (documentId: string, _uid: string, { data }: any) => ({
    documentId,
    ...data,
    [SECRET]: 's',
  })),
  clone: jest.fn<Promise<object>, [documentId: string, data: object, uid: string]>(
    async (documentId, data) => ({
      documentId: `${documentId}-clone`,
      ...data,
      [SECRET]: 's',
    })
  ),
  delete: jest.fn(async (documentId: string) => ({ documentId, [SECRET]: 's' })),
  publish: jest.fn(async (documentId: string) => [
    { documentId, publishedAt: '2026-01-01', [SECRET]: 's' },
  ]),
});

const setup = () => {
  const permissionChecker = createPermissionChecker();
  const documentManager = createDocumentManager();
  const formatDocumentWithMetadata = jest.fn(async (_uid: string, document: any, opts: any) => ({
    data: document,
    meta: { availableLocales: [{ locale: 'fr', [SECRET]: 's' }], availableStatus: [] },
    opts,
  }));
  const populateBuilder = {
    populateFromQuery: jest.fn().mockReturnThis(),
    populateDeep: jest.fn().mockReturnThis(),
    countRelations: jest.fn().mockReturnThis(),
    withPopulateOverride: jest.fn().mockReturnThis(),
    build: jest.fn().mockResolvedValue({ populated: true }),
  };
  const findMany = jest.fn();
  const services: Record<string, unknown> = {
    'permission-checker': { create: jest.fn(() => permissionChecker) },
    'document-manager': documentManager,
    'document-metadata': { formatDocumentWithMetadata },
    'populate-builder': () => populateBuilder,
  };
  const dbFindOne = jest.fn();

  global.strapi = {
    plugins: { 'content-manager': { services } },
    getModel: () => ({
      attributes: { title: { type: 'string' }, body: { type: 'string' } },
    }),
    documents: () => ({ findMany }),
    db: {
      query: () => ({ findOne: dbFindOne }),
      transaction: (callback: () => unknown) => callback(),
    },
  } as any;

  return { permissionChecker, documentManager, formatDocumentWithMetadata, findMany, dbFindOne };
};

const createCtx = ({ params = {}, query = {}, body = {} }: Record<string, any> = {}) => {
  const ctx = createContext(
    { params: { model, ...params }, query, body },
    { state: { userAbility: {}, user } }
  );
  ctx.forbidden = jest.fn(() => {
    ctx.status = 403;
  });
  ctx.notFound = jest.fn(() => {
    ctx.status = 404;
  });
  return ctx;
};

describe('collection-types controller', () => {
  describe('update', () => {
    test('updates the draft with the permitted fields and responds with sanitized metadata', async () => {
      const { documentManager, formatDocumentWithMetadata } = setup();
      documentManager.findOne.mockResolvedValue({ documentId: 'doc-1', locale: 'en' });
      const ctx = createCtx({
        params: { id: 'doc-1' },
        body: { title: 'Title', [NOT_PERMITTED]: 'x' },
      });

      await collectionTypes.update(ctx);

      expect(documentManager.update).toHaveBeenCalledWith('doc-1', model, {
        data: expect.objectContaining({ title: 'Title', updatedBy: user.id }),
        populate: undefined,
        locale: 'en',
      });
      expect(documentManager.update.mock.calls[0][2].data).not.toHaveProperty(NOT_PERMITTED);
      expect(formatDocumentWithMetadata).toHaveBeenCalledWith(
        model,
        expect.not.objectContaining({ [SECRET]: expect.anything() }),
        {}
      );
      expect(ctx.body.data).toMatchObject({ documentId: 'doc-1', title: 'Title' });
      expect(ctx.body.meta.availableLocales).toEqual([{ locale: 'fr' }]);
    });

    test('rejects an update of a document that does not exist', async () => {
      const { documentManager } = setup();
      documentManager.exists.mockResolvedValue(false);

      await expect(collectionTypes.update(createCtx({ params: { id: 'doc-1' } }))).rejects.toThrow(
        'Entity not found'
      );
      expect(documentManager.update).not.toHaveBeenCalled();
    });
  });

  describe('clone', () => {
    test('clones the draft with the creatable fields and responds with sanitized metadata', async () => {
      const { documentManager, formatDocumentWithMetadata } = setup();
      documentManager.findOne.mockResolvedValue({ documentId: 'doc-1', locale: 'en' });
      const ctx = createCtx({
        params: { sourceId: 'doc-1' },
        body: { title: 'Not creatable', body: 'Body', [NOT_PERMITTED]: 'x' },
      });

      await collectionTypes.clone(ctx);

      expect(documentManager.findOne).toHaveBeenCalledWith('doc-1', model, {
        populate: { populated: true },
        locale: 'en',
        status: 'draft',
      });
      const [documentId, data, uid] = documentManager.clone.mock.calls[0];
      expect([documentId, uid]).toEqual(['doc-1', model]);
      // `title` is not creatable for this user
      expect(data).toEqual({ title: null, body: 'Body', createdBy: user.id, updatedBy: user.id });
      expect(formatDocumentWithMetadata).toHaveBeenCalledWith(
        model,
        expect.objectContaining({ documentId: 'doc-1-clone' }),
        { availableLocales: false, availableStatus: false }
      );
      expect(ctx.body.data).not.toHaveProperty(SECRET);
    });

    test('responds not found when the source document has no draft', async () => {
      const { documentManager } = setup();
      documentManager.findOne.mockResolvedValue(null);
      const ctx = createCtx({ params: { sourceId: 'doc-1' } });

      await collectionTypes.clone(ctx);

      expect(ctx.notFound).toHaveBeenCalled();
      expect(documentManager.clone).not.toHaveBeenCalled();
    });

    test('responds forbidden without the create permission', async () => {
      const { permissionChecker, documentManager } = setup();
      permissionChecker.cannot.create.mockReturnValue(true);
      const ctx = createCtx({ params: { sourceId: 'doc-1' } });

      await collectionTypes.clone(ctx);

      expect(ctx.forbidden).toHaveBeenCalled();
      expect(documentManager.findOne).not.toHaveBeenCalled();
    });
  });

  describe('bulkFindForValidation', () => {
    test('returns the sanitized drafts of the requested documents', async () => {
      const { findMany } = setup();
      findMany.mockResolvedValue([
        { documentId: 'doc-1', [SECRET]: 's' },
        { documentId: 'doc-2', [SECRET]: 's' },
      ]);
      const ctx = createCtx({ body: { documentIds: ['doc-1', 'doc-2'], locale: 'en' } });

      await collectionTypes.bulkFindForValidation(ctx);

      expect(findMany).toHaveBeenCalledWith({
        populate: { deep: true },
        filters: { documentId: { $in: ['doc-1', 'doc-2'] } },
        locale: 'en',
        sort: undefined,
        status: 'draft',
      });
      expect(ctx.body).toEqual({ results: [{ documentId: 'doc-1' }, { documentId: 'doc-2' }] });
    });

    test('responds forbidden without the read permission', async () => {
      const { permissionChecker, findMany } = setup();
      permissionChecker.cannot.read.mockReturnValue(true);
      const ctx = createCtx({ body: { documentIds: ['doc-1'] } });

      await collectionTypes.bulkFindForValidation(ctx);

      expect(ctx.forbidden).toHaveBeenCalled();
      expect(findMany).not.toHaveBeenCalled();
    });
  });
});

describe('single-types controller', () => {
  describe('createOrUpdate', () => {
    test('creates the single type when no document exists', async () => {
      const { documentManager, dbFindOne } = setup();
      documentManager.findMany.mockResolvedValue([]);
      dbFindOne.mockResolvedValue(null);
      const ctx = createCtx({ body: { title: 'Home', [NOT_PERMITTED]: 'x' } });

      await singleTypes.createOrUpdate(ctx);

      expect(documentManager.create).toHaveBeenCalledWith(model, {
        data: { title: 'Home', createdBy: user.id, updatedBy: user.id },
        locale: 'en',
      });
      expect(ctx.body.data).toMatchObject({ documentId: 'new', title: 'Home' });
    });

    test('updates the existing document and responds with sanitized metadata', async () => {
      const { documentManager, dbFindOne } = setup();
      documentManager.findMany.mockResolvedValue([{ documentId: 'home', locale: 'en' }]);
      dbFindOne.mockResolvedValue({ documentId: 'home' });
      const ctx = createCtx({ body: { title: 'Home' } });

      await singleTypes.createOrUpdate(ctx);

      expect(documentManager.update).toHaveBeenCalledWith('home', model, {
        data: { title: 'Home', updatedBy: user.id },
        populate: undefined,
        locale: 'en',
      });
      expect(ctx.body.data).toEqual({ documentId: 'home', title: 'Home', updatedBy: user.id });
      expect(ctx.body.meta.availableLocales).toEqual([{ locale: 'fr' }]);
    });
  });

  describe('delete', () => {
    test('deletes the locale of the single type and responds with the sanitized entity', async () => {
      const { documentManager } = setup();
      documentManager.findLocales.mockResolvedValue([{ documentId: 'home', locale: 'en' }]);
      const ctx = createCtx();

      await singleTypes.delete(ctx);

      expect(documentManager.delete).toHaveBeenCalledWith('home', model, { locale: 'en' });
      expect(ctx.body).toEqual({ documentId: 'home' });
    });

    test('responds not found when the single type has no document', async () => {
      const { documentManager } = setup();
      documentManager.findLocales.mockResolvedValue([]);
      const ctx = createCtx();

      await singleTypes.delete(ctx);

      expect(ctx.notFound).toHaveBeenCalled();
      expect(documentManager.delete).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    test('saves, then publishes the draft and responds with sanitized metadata', async () => {
      const { documentManager, dbFindOne } = setup();
      documentManager.findMany.mockResolvedValue([{ documentId: 'home', locale: 'en' }]);
      dbFindOne.mockResolvedValue({ documentId: 'home' });
      const ctx = createCtx({ body: { title: 'Home' } });

      await singleTypes.publish(ctx);

      expect(documentManager.update).toHaveBeenCalledWith(
        'home',
        model,
        expect.objectContaining({ data: { title: 'Home', updatedBy: user.id } })
      );
      expect(documentManager.publish).toHaveBeenCalledWith('home', model, { locale: 'en' });
      expect(ctx.body.data).toEqual({ documentId: 'home', publishedAt: '2026-01-01' });
    });
  });
});
