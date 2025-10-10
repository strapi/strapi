import { queryParams } from '@strapi/utils';

import createReleaseService from '../release';
import releaseCT from '../../content-types/release/schema';

const mockSchedulingSet = jest.fn();
const mockSchedulingCancel = jest.fn();
const mockExecute = jest.fn();
const mockPublish = jest.fn();
const mockUnpublish = jest.fn();

const baseStrapiMock = {
  utils: {
    errors: {
      ValidationError: jest.fn(),
    },
  },
  plugin: jest.fn().mockReturnValue({
    service: jest.fn().mockReturnValue({
      validateEntryContentType: jest.fn(),
      validateUniqueEntry: jest.fn(),
      validatePendingReleasesLimit: jest.fn(),
      validateUniqueNameForPendingRelease: jest.fn(),
      validateScheduledAtIsLaterThanNow: jest.fn(),
      set: mockSchedulingSet,
      cancel: mockSchedulingCancel,
      countActions: jest.fn(),
    }),
  }),
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
      execute: mockExecute,
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
  documents: jest.fn().mockReturnValue({
    findFirst: jest.fn().mockReturnValue({ id: 1 }),
    publish: mockPublish,
    unpublish: mockUnpublish,
  }),
};

global.strapi = {
  getModel: jest.fn().mockReturnValue(releaseCT),
} as any;

const mockUser = {
  id: 1,
  username: 'user',
  email: 'user@strapi.io',
  firstname: 'John',
  isActive: true,
  blocked: false,
  preferedLanguage: 'en',
  roles: [],
  createdAt: '01/01/1900',
  updatedAt: '01/01/1900',
};

describe('Release service', () => {
  describe('update', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('updates the release', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
            update: jest.fn().mockReturnValue({ id: 1, name: 'Release name' }),
            count: jest.fn(),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
      };

      const release = await releaseService.update(1, mockReleaseArgs, { user: mockUser });

      expect(release).toEqual({ id: 1, name: 'Release name' });
    });

    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue(null),
            update: jest.fn().mockReturnValue(null),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
      };

      expect(() => releaseService.update(1, mockReleaseArgs, { user: mockUser })).rejects.toThrow(
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
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
      };

      expect(() => releaseService.update(1, mockReleaseArgs, { user: mockUser })).rejects.toThrow(
        'Release already published'
      );
    });

    it('should set scheduling if scheduledAt is present', async () => {
      const scheduledDate = new Date();

      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
            update: jest
              .fn()
              .mockReturnValue({ id: 1, name: 'Release name', scheduledAt: scheduledDate }),
            count: jest.fn(),
          }),
        },
      } as any;

      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
        scheduledAt: scheduledDate,
      };

      const release = await releaseService.update(1, mockReleaseArgs, { user: mockUser });

      expect(release).toEqual({ id: 1, name: 'Release name', scheduledAt: scheduledDate });
      expect(mockSchedulingSet).toHaveBeenCalledWith(1, mockReleaseArgs.scheduledAt);
    });

    it('should remove scheduling if scheduledAt is null', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test', scheduledAt: new Date() }),
            update: jest.fn().mockReturnValue({ id: 1, name: 'Release name', scheduledAt: null }),
            count: jest.fn(),
          }),
        },
      } as any;

      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
        scheduledAt: null,
      };

      const release = await releaseService.update(1, mockReleaseArgs, { user: mockUser });

      expect(release).toEqual({ id: 1, name: 'Release name', scheduledAt: null });
      expect(mockSchedulingCancel).toHaveBeenCalledWith(1);
    });
  });

  describe('publish', () => {
    it('throws an error if the release does not exist', () => {
      mockExecute.mockReturnValueOnce(null);

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: baseStrapiMock });

      expect(() => releaseService.publish(1)).rejects.toThrow('No release found for id 1');
    });

    it('throws an error if the release is already published', () => {
      mockExecute.mockReturnValueOnce({ id: 1, releasedAt: new Date() });

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: baseStrapiMock });

      expect(() => releaseService.publish(1)).rejects.toThrow('Release already published');
    });

    it('throws an error if the release have 0 actions', () => {
      mockExecute.mockReturnValueOnce({ id: 1, releasedAt: null });

      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest.fn().mockReturnValue([]),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.publish(1)).rejects.toThrow('No entries to publish');
    });

    it('calls publish for each collectionType with the right actions', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, releasedAt: null });
      const findOne = jest.fn();
      const findMany = jest.fn();

      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest.fn().mockReturnValue([
              {
                contentType: 'collectionType',
                type: 'publish',
                entry: { id: 1 },
              },
              {
                contentType: 'collectionType',
                type: 'unpublish',
                entry: { id: 2 },
              },
              {
                contentType: 'singleType',
                type: 'publish',
                entry: { id: 3 },
              },
              {
                contentType: 'singleType',
                type: 'unpublish',
                entry: { id: 4 },
              },
            ]),
            update: jest.fn(),
          }),
        },
        entityService: {
          findOne,
          findMany,
          update: jest.fn().mockReturnValue({}),
        },
        contentTypes: {
          collectionType: {
            kind: 'collectionType',
          },
          singleType: {
            kind: 'singleType',
          },
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      // We mock the calls to findOne to get singleType entries info
      findOne.mockReturnValueOnce({
        id: 3,
      });

      findOne.mockReturnValueOnce({
        id: 4,
      });

      findMany.mockReturnValueOnce([
        {
          id: 1,
        },
      ]);

      findMany.mockReturnValueOnce([
        {
          id: 2,
        },
      ]);

      await releaseService.publish(1);

      expect(mockPublish).toHaveBeenCalledTimes(2);
      expect(mockUnpublish).toHaveBeenCalledTimes(2);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('deletes the release', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query() {
            return {
              findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
              delete: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
            };
          },
          transaction: jest.fn(),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const release = await releaseService.delete(1);

      expect(release).toEqual({ id: 1, name: 'test' });
    });

    it('throws an error if the release does not exist or was already published', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query() {
            return {
              findOne: jest.fn().mockReturnValue(null),
            };
          },
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.delete(1)).rejects.toThrow('No release found for id 1');
    });

    it('throws an error if the release is already published', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue({ releasedAt: new Date() }),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.delete(1)).rejects.toThrow('Release already published');
    });

    it('removes the scheduling if the release is scheduled', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test', scheduledAt: new Date() }),
            delete: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
          }),
          transaction: jest.fn(),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await releaseService.delete(1);

      expect(mockSchedulingCancel).toHaveBeenCalledWith(1);
    });

    it('does not remove the scheduling if the release is not scheduled', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
            delete: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
          }),
          transaction: jest.fn(),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await releaseService.delete(1);

      expect(mockSchedulingCancel).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should set creator fields', async () => {
      const createFn = jest.fn().mockReturnValue({ id: 1, name: 'test' });

      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            create: createFn,
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
      } as any;

      const release = await releaseService.create(mockReleaseArgs, { user: mockUser });

      expect(release).toEqual({ id: 1, name: 'test' });
      expect(createFn).toHaveBeenCalledWith({
        data: {
          createdBy: mockUser.id,
          updatedBy: mockUser.id,
          name: 'Release name',
          status: 'empty',
        },
      });
    });

    it('should create a release', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            create: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
        scheduledAt: null,
        timezone: null,
      };

      const release = await releaseService.create(mockReleaseArgs, { user: mockUser });

      expect(release).toEqual({ id: 1, name: 'test' });
    });

    it('should set scheduling if scheduledAt is present', async () => {
      const scheduledDate = new Date();

      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: () => ({
            create: jest.fn().mockReturnValue({ id: 1, name: 'test', scheduledAt: scheduledDate }),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
        scheduledAt: scheduledDate,
        timezone: null,
      };

      const release = await releaseService.create(mockReleaseArgs, { user: mockUser });

      expect(release).toEqual({ id: 1, name: 'test', scheduledAt: scheduledDate });
      expect(mockSchedulingSet).toHaveBeenCalledWith(1, mockReleaseArgs.scheduledAt);
    });
  });
});
