// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import relations from '../relations';

const SHOP_UID = 'api::shop.shop';
const TAG_UID = 'api::tag.tag';

const shopModel = {
  uid: SHOP_UID,
  modelType: 'contentType',
  options: { draftAndPublish: true },
  attributes: {
    tags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
    mainTag: { type: 'relation', relation: 'oneToOne', target: TAG_UID },
  },
};

// No draft & publish on the target: findExisting then returns the loaded relations as is
const tagModel = {
  uid: TAG_UID,
  modelType: 'contentType',
  options: { draftAndPublish: false },
  attributes: {
    name: { type: 'string' },
  },
};

const PERMITTED_FIELDS = ['name', 'publishedAt', 'updatedAt', 'documentId'];

const setupStrapi = ({
  permissionQuery,
  dbQuery,
}: {
  permissionQuery: Record<string, unknown>;
  dbQuery: Record<string, jest.Mock>;
}) => {
  global.strapi = {
    getModel: jest.fn((uid: string) => {
      if (uid === SHOP_UID) {
        return shopModel;
      }
      if (uid === TAG_UID) {
        return tagModel;
      }
      return null;
    }),
    localization: {
      isLocalizedContentType: jest.fn(() => false),
    },
    plugins: {
      'content-manager': {
        services: {
          'permission-checker': {
            create: jest.fn().mockReturnValue({
              can: { read: jest.fn().mockReturnValue(true) },
              cannot: { read: jest.fn().mockReturnValue(false) },
              sanitizedQuery: { read: jest.fn().mockResolvedValue(permissionQuery) },
            }),
          },
          'populate-builder': () => ({
            populateFromQuery: jest.fn().mockReturnThis(),
            build: jest.fn().mockResolvedValue({}),
          }),
          'content-types': {
            findConfiguration: jest.fn().mockResolvedValue({
              metadatas: {
                tags: { edit: { mainField: 'name' } },
                mainTag: { edit: { mainField: 'name' } },
              },
            }),
          },
        },
      },
    },
    plugin: jest.fn(() => ({
      service: (name: string) => global.strapi.plugins['content-manager'].services[name],
    })),
    db: {
      query: jest.fn(() => dbQuery),
    },
    get: jest.fn((name: string) => {
      if (name === 'query-params') {
        // fields -> select, filters -> where, like the real transformer
        return {
          transform: jest.fn((_uid: string, params: any) => ({
            select: params.fields,
            where: params.filters,
          })),
        };
      }
      return undefined;
    }),
  } as any;
};

const createCtx = (targetField: string) =>
  createContext(
    {
      params: { model: SHOP_UID, targetField, id: 'shop-document-id' },
      query: { page: '1', pageSize: '5' },
    },
    { state: { userAbility: {} } }
  );

describe('findExisting', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the read permission on the target has no row-level conditions', () => {
    it('loads the page once, with the permitted fields', async () => {
      const dbQuery = {
        findOne: jest.fn().mockResolvedValue({ id: 10 }),
        loadPages: jest.fn().mockResolvedValue({
          results: [{ id: 1, documentId: 'tag-1', name: 'Tag 1' }],
          pagination: { page: 1, pageSize: 5, pageCount: 1, total: 1 },
        }),
        load: jest.fn(),
      };
      // What the permissions manager returns for an unconditional read permission
      setupStrapi({ permissionQuery: { fields: PERMITTED_FIELDS, filters: {} }, dbQuery });

      const ctx = createCtx('tags');
      await relations.findExisting(ctx);

      expect(dbQuery.loadPages).toHaveBeenCalledTimes(1);
      expect(dbQuery.loadPages).toHaveBeenCalledWith(
        { id: 10 },
        'tags',
        expect.objectContaining({
          select: ['id', 'documentId', 'locale', 'publishedAt', 'updatedAt', 'name'],
          ordering: 'desc',
          page: '1',
          pageSize: '5',
        })
      );
      expect(dbQuery.load).not.toHaveBeenCalled();
      expect(ctx.body).toEqual({
        pagination: { page: 1, pageSize: 5, pageCount: 1, total: 1 },
        results: [{ id: 1, documentId: 'tag-1', name: 'Tag 1' }],
      });
    });

    it('does not select fields the user cannot read', async () => {
      const dbQuery = {
        findOne: jest.fn().mockResolvedValue({ id: 10 }),
        loadPages: jest.fn().mockResolvedValue({ results: [], pagination: {} }),
        load: jest.fn(),
      };
      // The permissions manager removed `name` from the fields
      setupStrapi({
        permissionQuery: { fields: ['publishedAt', 'updatedAt', 'documentId'] },
        dbQuery,
      });

      await relations.findExisting(createCtx('tags'));

      expect(dbQuery.loadPages).toHaveBeenCalledTimes(1);
      expect(dbQuery.loadPages.mock.calls[0][2].select).not.toContain('name');
    });

    it('loads a to-one relation once and wraps it in a page', async () => {
      const dbQuery = {
        findOne: jest.fn().mockResolvedValue({ id: 10 }),
        loadPages: jest.fn(),
        load: jest.fn().mockResolvedValue({ id: 3, documentId: 'tag-3', name: 'Tag 3' }),
      };
      setupStrapi({ permissionQuery: { fields: PERMITTED_FIELDS }, dbQuery });

      const ctx = createCtx('mainTag');
      await relations.findExisting(ctx);

      expect(dbQuery.load).toHaveBeenCalledTimes(1);
      expect(dbQuery.loadPages).not.toHaveBeenCalled();
      expect(ctx.body).toEqual({
        pagination: { page: 1, pageCount: 1, pageSize: 10, total: 1 },
        results: [{ id: 3, documentId: 'tag-3', name: 'Tag 3' }],
      });
    });
  });

  describe('when the read permission on the target has row-level conditions', () => {
    it('loads the ids, then only the relations the user can read, and returns their union', async () => {
      const dbQuery = {
        findOne: jest.fn().mockResolvedValue({ id: 10 }),
        loadPages: jest
          .fn()
          // 1. every relation of the page, ids only
          .mockResolvedValueOnce({
            results: [
              { id: 1, documentId: 'tag-1' },
              { id: 2, documentId: 'tag-2' },
            ],
            pagination: { page: 1, pageSize: 5, pageCount: 1, total: 2 },
          })
          // 2. the ones matching the permission conditions, with the main field
          .mockResolvedValueOnce({
            results: [{ id: 1, documentId: 'tag-1', name: 'Tag 1' }],
            pagination: { page: 1, pageSize: 5, pageCount: 1, total: 1 },
          }),
        load: jest.fn(),
      };
      const conditions = { $or: [{ createdBy: { id: 42 } }] };
      setupStrapi({ permissionQuery: { fields: PERMITTED_FIELDS, filters: conditions }, dbQuery });

      const ctx = createCtx('tags');
      await relations.findExisting(ctx);

      expect(dbQuery.loadPages).toHaveBeenCalledTimes(2);
      expect(dbQuery.loadPages).toHaveBeenNthCalledWith(
        1,
        { id: 10 },
        'tags',
        expect.objectContaining({
          select: ['id', 'documentId', 'locale', 'publishedAt', 'updatedAt'],
          page: '1',
          pageSize: '5',
        })
      );
      expect(dbQuery.loadPages).toHaveBeenNthCalledWith(
        2,
        { id: 10 },
        'tags',
        expect.objectContaining({
          select: PERMITTED_FIELDS,
          where: { ...conditions, $and: [{ id: { $in: [1, 2] } }] },
        })
      );
      expect(ctx.body).toEqual({
        pagination: { page: 1, pageSize: 5, pageCount: 1, total: 2 },
        results: [
          { id: 1, documentId: 'tag-1', name: 'Tag 1' },
          { id: 2, documentId: 'tag-2' },
        ],
      });
    });
  });
});
