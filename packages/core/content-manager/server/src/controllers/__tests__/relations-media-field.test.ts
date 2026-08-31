import { queryParams } from '@strapi/utils';

// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import relations from '../relations';

/**
 * Coverage for the `mediaField` populate added to the relation endpoints.
 *
 * The upstream `relations.test.ts` suite is `describe.skip`-ed, so these tests live in
 * their own file and build their own mocks rather than reviving that suite.
 */

const MEDIA_FIELDS = ['url', 'alternativeText', 'formats', 'width', 'height', 'mime', 'name'];

// What the query-params transform is expected to produce out of MEDIA_FIELDS
const EXPECTED_MEDIA_SELECT = ['id', 'documentId', ...MEDIA_FIELDS];

const contentTypes: Record<string, any> = {
  main: {
    uid: 'main',
    modelType: 'contentType',
    kind: 'collectionType',
    options: {},
    attributes: {
      products: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'target',
        targetModel: 'target',
      },
    },
  },
  target: {
    uid: 'target',
    modelType: 'contentType',
    kind: 'collectionType',
    options: {},
    attributes: {
      myField: { type: 'string' },
      coverImage: { type: 'media', multiple: false },
      category: { type: 'relation', relation: 'manyToOne', target: 'main', targetModel: 'main' },
    },
  },
  'plugin::upload.file': {
    uid: 'plugin::upload.file',
    modelType: 'contentType',
    kind: 'collectionType',
    options: {},
    attributes: {
      name: { type: 'string' },
      url: { type: 'string' },
      alternativeText: { type: 'string' },
      formats: { type: 'json' },
      width: { type: 'integer' },
      height: { type: 'integer' },
      mime: { type: 'string' },
      // Fields that must never leak into the relation payload
      provider: { type: 'string' },
      provider_metadata: { type: 'json' },
      folderPath: { type: 'string' },
    },
  },
};

const { transformQueryParams } = queryParams.createTransformer({
  getModel: (uid: string) => contentTypes[uid],
});

type Options = {
  mediaField?: string | null;
  canReadMediaField?: boolean;
  permissionQueryPopulate?: Record<string, unknown>;
};

const loadPages = jest.fn(() => ({ results: [{ id: 1 }, { id: 2 }], pagination: {} }));
const findPage = jest.fn(() => ({ results: [] }));
const findOne = jest.fn(() => ({ id: 1 }));
const findMany = jest.fn(() => [
  { id: 1, coverImage: { id: 10, url: '/uploads/a.jpg', mime: 'image/jpeg' } },
  { id: 2, coverImage: null },
]);

const setupStrapi = ({
  mediaField = 'coverImage',
  canReadMediaField = true,
  permissionQueryPopulate,
}: Options = {}) => {
  const services: Record<string, any> = {
    'permission-checker': {
      create: jest.fn(() => ({
        can: {
          read: jest.fn((_entity: unknown, field?: string) =>
            field === 'coverImage' ? canReadMediaField : true
          ),
        },
        cannot: { read: jest.fn(() => false) },
        sanitizedQuery: {
          read: jest.fn((params: Record<string, unknown>) => ({
            ...params,
            ...(permissionQueryPopulate ? { populate: permissionQueryPopulate } : {}),
          })),
        },
      })),
    },
    'populate-builder': () => ({
      populateFromQuery: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({})),
    }),
    'content-types': {
      findConfiguration: jest.fn(() => ({
        metadatas: {
          products: {
            edit: { mainField: 'myField', ...(mediaField ? { mediaField } : {}) },
          },
        },
      })),
    },
  };

  // NOTE: `tests/setup/unit.setup.js` derives `strapi.plugin()` from `strapi.plugins`
  global.strapi = {
    getModel: jest.fn((uid: string) => contentTypes[uid]),
    get: jest.fn((name: string) => {
      if (name === 'query-params') {
        return { transform: transformQueryParams };
      }

      throw new Error(`Unexpected strapi.get('${name}')`);
    }),
    plugins: {
      'content-manager': { services },
      i18n: {
        services: { 'content-types': { isLocalizedContentType: () => false } },
      },
    },
    db: {
      query: jest.fn(() => ({ loadPages, load: jest.fn(), findOne, findPage, findMany })),
    },
  } as any;
};

const createFindExistingContext = () =>
  createContext(
    { params: { model: 'main', targetField: 'products', id: 'doc-1' }, query: {} },
    { state: { userAbility: {} } }
  );

describe('Relations controller | mediaField populate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findExisting', () => {
    test('never populates the media on the permission-free query', async () => {
      setupStrapi();

      await relations.findExisting(createFindExistingContext());

      expect(loadPages).toHaveBeenCalledTimes(2);

      // First query bypasses the permission query: it must expose ids/dates only
      const [, , unsanitizedOptions] = loadPages.mock.calls[0] as unknown as any[];

      expect(unsanitizedOptions).not.toHaveProperty('populate');
      expect(unsanitizedOptions.select).toEqual([
        'id',
        'documentId',
        'locale',
        'publishedAt',
        'updatedAt',
      ]);
    });

    /**
     * REGRESSION GUARD — `loadPages` forwards the very same options to its `count: true`
     * companion. Any populate here leaks the selected columns into an aggregate, which
     * PostgreSQL rejects with `column "t0.id" must appear in the GROUP BY clause`.
     * SQLite and MySQL tolerate it, so this can only be caught structurally.
     */
    test('never passes a media populate to loadPages, on either query', async () => {
      setupStrapi();

      await relations.findExisting(createFindExistingContext());

      const [, , unsanitizedOptions] = loadPages.mock.calls[0] as unknown as any[];
      const [, , sanitizedOptions] = loadPages.mock.calls[1] as unknown as any[];

      expect(unsanitizedOptions?.populate?.coverImage).toBeUndefined();
      expect(sanitizedOptions?.populate?.coverImage).toBeUndefined();
    });

    test('loads the media in a dedicated query, restricted to the permission-checked ids', async () => {
      setupStrapi();

      await relations.findExisting(createFindExistingContext());

      expect(findMany).toHaveBeenCalledTimes(1);

      const [query] = findMany.mock.calls[0] as unknown as any[];

      // Only the ids returned by the sanitized query may have their media loaded
      expect(query.where).toEqual({ id: { $in: [1, 2] } });
      // `fields` is dropped by the db layer's pickPopulateParams, `select` is not
      expect(query.populate.coverImage).not.toHaveProperty('fields');
      expect(query.populate.coverImage.select).toEqual(EXPECTED_MEDIA_SELECT);
      expect(query.populate.coverImage.select).not.toContain('provider');
      expect(query.populate.coverImage.select).not.toContain('provider_metadata');
    });

    test('attaches the loaded media to the returned relations', async () => {
      setupStrapi();

      const ctx = createFindExistingContext();
      await relations.findExisting(ctx);

      const results = (ctx.body as any).results;

      expect(results.find((r: any) => r.id === 1).coverImage).toEqual({
        id: 10,
        url: '/uploads/a.jpg',
        mime: 'image/jpeg',
      });
      expect(results.find((r: any) => r.id === 2).coverImage).toBeNull();
    });

    test('leaves the populate coming from the permission query untouched', async () => {
      setupStrapi({ permissionQueryPopulate: { category: true } });

      await relations.findExisting(createFindExistingContext());

      const [, , sanitizedOptions] = loadPages.mock.calls[1] as unknown as any[];

      expect(sanitizedOptions.populate).toMatchObject({ category: true });
      expect(sanitizedOptions.populate).not.toHaveProperty('coverImage');
    });

    test('does not query the media when no mediaField is configured', async () => {
      setupStrapi({ mediaField: null });

      await relations.findExisting(createFindExistingContext());

      const [, , unsanitizedOptions] = loadPages.mock.calls[0] as unknown as any[];

      expect(unsanitizedOptions).not.toHaveProperty('populate');
      expect(findMany).not.toHaveBeenCalled();
    });

    test('does not query the media when the user cannot read the media field', async () => {
      setupStrapi({ canReadMediaField: false });

      await relations.findExisting(createFindExistingContext());

      expect(findMany).not.toHaveBeenCalled();
    });

    test('does not query the media when the configured field is not a media attribute', async () => {
      setupStrapi({ mediaField: 'myField' });

      await relations.findExisting(createFindExistingContext());

      expect(findMany).not.toHaveBeenCalled();
    });
  });

  describe('findAvailable', () => {
    const createFindAvailableContext = () =>
      createContext(
        { params: { model: 'main', targetField: 'products' }, query: {} },
        { state: { userAbility: {} } }
      );

    test('populates the media using db params and keeps the permission query populate', async () => {
      setupStrapi({ permissionQueryPopulate: { category: true } });

      await relations.findAvailable(createFindAvailableContext());

      const [dbQuery] = findPage.mock.calls[0] as unknown as any[];

      expect(dbQuery.populate).toMatchObject({
        category: true,
        coverImage: { select: EXPECTED_MEDIA_SELECT },
      });
      expect(dbQuery.populate.coverImage).not.toHaveProperty('fields');
    });

    test('does not populate anything when no mediaField is configured', async () => {
      setupStrapi({ mediaField: null });

      await relations.findAvailable(createFindAvailableContext());

      const [dbQuery] = findPage.mock.calls[0] as unknown as any[];

      expect(dbQuery).not.toHaveProperty('populate');
    });
  });
});
