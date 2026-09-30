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
    tags: { type: 'relation', target: TAG_UID },
  },
};

const tagModel = {
  uid: TAG_UID,
  modelType: 'contentType',
  options: { draftAndPublish: false },
  attributes: {
    name: { type: 'string' },
  },
};

const createQueryBuilder = () => {
  const qb: Record<string, any> = {};
  qb.getAlias = jest.fn(() => 't1');
  qb.where = jest.fn(() => qb);
  qb.join = jest.fn(() => qb);
  qb.select = jest.fn(() => qb);
  qb.getKnexQuery = jest.fn(() => 'SUBQUERY');
  return qb;
};

const setupStrapi = (queryBuilder: ReturnType<typeof createQueryBuilder>) => {
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
    plugins: {
      i18n: {
        services: {
          'content-types': {
            isLocalizedContentType: jest.fn(() => false),
          },
        },
      },
      'content-manager': {
        services: {
          'permission-checker': {
            create: jest.fn().mockReturnValue({
              can: { read: jest.fn().mockReturnValue(true) },
              cannot: { read: jest.fn().mockReturnValue(false) },
              sanitizedQuery: { read: jest.fn().mockResolvedValue({}) },
            }),
          },
          'populate-builder': () => ({
            populateFromQuery: jest.fn().mockReturnThis(),
            build: jest.fn().mockResolvedValue({}),
          }),
          'content-types': {
            findConfiguration: jest.fn().mockResolvedValue({
              metadatas: {
                tags: {
                  edit: {
                    mainField: 'name',
                  },
                },
              },
            }),
          },
        },
      },
    },
    db: {
      query: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 10 }),
        findPage: jest.fn().mockResolvedValue({ results: [], pagination: {} }),
      }),
      queryBuilder: jest.fn(() => queryBuilder),
    },
    get: jest.fn((name: string) => {
      if (name === 'query-params') {
        return { transform: jest.fn((_uid: string, params: unknown) => params) };
      }
      return undefined;
    }),
  } as any;
};

const createCtx = (query: Record<string, unknown>) => {
  return createContext(
    {
      params: { model: SHOP_UID, targetField: 'tags' },
      query,
    },
    { state: { userAbility: {} } }
  );
};

describe('findAvailable source-row status filter', () => {
  let queryBuilder: ReturnType<typeof createQueryBuilder>;

  beforeEach(() => {
    queryBuilder = createQueryBuilder();
    setupStrapi(queryBuilder);
  });

  test('draft exclusion only matches the draft source row (issue #23743)', async () => {
    await relations.findAvailable(createCtx({ id: 'shop-doc', status: 'draft' }));

    expect(queryBuilder.where).toHaveBeenCalledWith(
      expect.objectContaining({
        document_id: 'shop-doc',
        published_at: { $null: true },
      })
    );
    expect(queryBuilder.where.mock.calls[0][0]['t1.published_at']).toBeUndefined();
  });

  test('published exclusion only matches the published source row', async () => {
    await relations.findAvailable(createCtx({ id: 'shop-doc', status: 'published' }));

    expect(queryBuilder.where).toHaveBeenCalledWith(
      expect.objectContaining({
        document_id: 'shop-doc',
        published_at: { $notNull: true },
      })
    );
  });
});
