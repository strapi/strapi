import { queryParams } from '@strapi/utils';

import createReleaseActionService from '../release-action';

const serviceMock = {
  'release-validation': {
    validateEntryData: jest.fn(),
    validateUniqueEntry: jest.fn(),
    validatePendingReleasesLimit: jest.fn(),
    validateUniqueNameForPendingRelease: jest.fn(),
    validateScheduledAtIsLaterThanNow: jest.fn(),
  },
  'populate-builder': () => ({
    default: jest.fn().mockReturnThis(),
    populateDeep: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnThis(),
  }),
  release: {
    updateReleaseStatus: jest.fn(),
  },
};

const baseStrapiMock = {
  utils: {
    errors: {
      ValidationError: jest.fn(),
    },
  },
  features: {
    future: {
      isEnabled: jest.fn().mockReturnValue(true),
    },
  },
  db: {
    query: jest.fn().mockReturnValue({
      update: jest.fn(),
    }),
    transaction: jest
      .fn()
      .mockImplementation((fn) =>
        fn ? fn({ trx: jest.fn() }) : { commit: jest.fn(), get: jest.fn() }
      ),
    queryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      transacting: jest.fn().mockReturnThis(),
      forUpdate: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    }),
  },
  eventHub: {
    emit: jest.fn(),
  },
  telemetry: {
    send: jest.fn().mockReturnValue(true),
  },
  log: {
    info: jest.fn(),
  },
  get(name: string) {
    if (name === 'query-params') {
      const transformer = queryParams.createTransformer({
        getModel(name: string) {
          return strapi.getModel(name as any);
        },
      });

      return {
        transform: transformer.transformQueryParams,
      };
    }
  },
  getModel: jest.fn((contentType: string) => {
    const map: Record<string, any> = {
      'api::contentTypeA.contentTypeA': {
        info: {
          displayName: 'contentTypeA',
        },
      },
      'api::contentTypeB.contentTypeB': {
        info: {
          displayName: 'contentTypeB',
        },
      },
    };

    return map[contentType];
  }),
  contentType: jest.fn((contentType: string) => {
    const map: Record<string, any> = {
      'api::contentTypeA.contentTypeA': {
        kind: 'collectionType',
      },
      'api::contentTypeB.contentTypeB': {
        kind: 'collectionType',
      },
    };

    return map[contentType];
  }),
  documents: jest.fn().mockReturnValue({
    findOne: jest.fn().mockReturnValue({ documentId: 'id', name: 'test' }),
    findFirst: jest.fn().mockReturnValue({ documentId: 'id', name: 'test' }),
  }),
  plugin: jest.fn().mockReturnValue({
    service: jest
      .fn()
      .mockImplementation((service: 'release-validation' | 'populate-builder' | 'release') => {
        return serviceMock[service];
      }),
  }),
};

describe('Release Action service', () => {
  describe('findPage', () => {
    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue(null),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      expect(() => releaseActionService.findPage(1, {})).rejects.toThrow(
        'No release found for id 1'
      );
    });
  });

  describe('create', () => {
    it('creates an action', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            create: jest.fn().mockReturnValue({
              type: 'publish',
              entry: { id: 1, contentType: 'api::contentTypeA.contentTypeA' },
            }),
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
            count: jest.fn(),
            update: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      const mockActionArgs = {
        type: 'publish' as const,
        entryDocumentId: '1',
        contentType: 'api::contentTypeA.contentTypeA' as const,
      };

      const action = await releaseActionService.create(1, mockActionArgs);

      expect(action).toEqual({
        type: 'publish',
        entry: { id: 1, contentType: 'api::contentTypeA.contentTypeA' },
      });
    });

    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue(null),
          }),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      const mockActionArgs = {
        type: 'publish' as const,
        entryDocumentId: '1',
        contentType: 'api::contentTypeA.contentTypeA' as const,
      };

      expect(() => releaseActionService.create(1, mockActionArgs)).rejects.toThrow(
        'No release found for id 1'
      );
    });

    it('throws an error if the release is already published', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test', releasedAt: new Date() }),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      const mockActionArgs = {
        type: 'publish' as const,
        entryDocumentId: '1',
        contentType: 'api::contentTypeA.contentTypeA' as const,
      };

      expect(() => releaseActionService.create(1, mockActionArgs)).rejects.toThrow(
        'Release already published'
      );
    });
  });

  describe('groupActions', () => {
    it('should return the data grouped by contentType', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            findConfiguration: jest.fn().mockReturnValue({ settings: { mainField: 'name' } }),
            find: jest.fn().mockReturnValue([
              { name: 'English (en)', code: 'en' },
              { name: 'French (fr)', code: 'fr' },
            ]),
          }),
        }),
      };

      const mockActions = [
        {
          id: 1,
          contentType: 'api::contentTypeA.contentTypeA',
          locale: 'en',
          entryDocumentId: '1',
          entry: {
            name: 'test 1',
            publishedAt: '2021-01-01',
          },
        },
        {
          id: 2,
          contentType: 'api::contentTypeB.contentTypeB',
          locale: 'fr',
          entryDocumentId: '2',
          entry: {
            name: 'test 2',
            publishedAt: null,
          },
        },
      ];

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      // @ts-expect-error ignore missing properties
      const groupedData = await releaseActionService.groupActions(mockActions, 'contentType');

      expect(groupedData).toEqual({
        contentTypeA: [
          {
            id: 1,
            contentType: {
              displayName: 'contentTypeA',
              mainFieldValue: 'test 1',
              uid: 'api::contentTypeA.contentTypeA',
            },
            locale: {
              code: 'en',
              name: 'English (en)',
            },
            entryDocumentId: '1',
            entry: {
              name: 'test 1',
              publishedAt: '2021-01-01',
            },
          },
        ],
        contentTypeB: [
          {
            id: 2,
            contentType: {
              displayName: 'contentTypeB',
              mainFieldValue: 'test 2',
              uid: 'api::contentTypeB.contentTypeB',
            },
            locale: {
              code: 'fr',
              name: 'French (fr)',
            },
            entryDocumentId: '2',
            entry: {
              name: 'test 2',
              publishedAt: null,
            },
          },
        ],
      });
    });
  });

  describe('delete', () => {
    it('deletes the action', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnValue({ id: 1, type: 'publish' }),
            update: jest.fn().mockReturnValue({ id: 1, type: 'publish' }),
            count: jest.fn(),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      const release = await releaseActionService.delete(1, 1);

      expect(release).toEqual({ id: 1, type: 'publish' });
    });

    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnValue(null),
            updated: jest.fn().mockReturnValue(null),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      expect(() => releaseActionService.delete(1, 1)).rejects.toThrow(
        'Action with id 1 not found in release with id 1 or it is already published'
      );
    });
  });

  describe('update', () => {
    it('updates the action', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            findOne: jest.fn().mockReturnValue({ id: 1, type: 'publish' }),
            update: jest.fn().mockReturnValue({ id: 1, type: 'publish' }),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      const release = await releaseActionService.update(1, 1, { type: 'publish' });

      expect(release).toEqual({ id: 1, type: 'publish' });
    });

    it('throws an error if the release does not exist or was already published', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            findOne: jest.fn().mockReturnValue(null),
            update: jest.fn().mockReturnValue(null),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      expect(() => releaseActionService.update(1, 1, { type: 'publish' })).rejects.toThrow(
        'Action with id 1 not found in release with id 1 or it is already published'
      );
    });
  });
});
