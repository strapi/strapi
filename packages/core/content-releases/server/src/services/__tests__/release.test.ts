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

    it('publishes content types in dependency order so relations are resolved correctly', async () => {
      const ARTICLE_UID = 'api::article.article';
      const CATEGORY_UID = 'api::category.category';

      mockExecute.mockReturnValueOnce({ id: 1, releasedAt: null });

      const documentsCallOrder: string[] = [];
      const documentsMock = jest.fn((contentType: string) => {
        documentsCallOrder.push(contentType);
        return {
          findFirst: jest.fn().mockReturnValue({ id: 1 }),
          publish: mockPublish,
          unpublish: mockUnpublish,
        };
      });

      const articleModel = {
        info: { displayName: 'Article' },
        options: { draftAndPublish: true },
        attributes: {
          category: { type: 'relation', target: CATEGORY_UID },
        },
      };

      const categoryModel = {
        info: { displayName: 'Category' },
        options: { draftAndPublish: true },
        attributes: {},
      };

      const getModelMock = jest.fn((uid: string) => {
        if (uid === ARTICLE_UID) return articleModel;
        if (uid === CATEGORY_UID) return categoryModel;
        return null;
      });

      const strapiMock = {
        ...baseStrapiMock,
        getModel: getModelMock,
        contentTypes: {
          [ARTICLE_UID]: {},
          [CATEGORY_UID]: {},
        },
        documents: documentsMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockImplementation((modelUid: string) => {
            if (modelUid === 'plugin::content-releases.release-action') {
              return {
                findMany: jest.fn().mockResolvedValue([
                  { contentType: ARTICLE_UID, type: 'publish', entryDocumentId: 'doc1' },
                  { contentType: CATEGORY_UID, type: 'publish', entryDocumentId: 'doc2' },
                ]),
              };
            }
            return {
              update: jest
                .fn()
                .mockResolvedValue({ id: 1, status: 'done', releasedAt: new Date() }),
            };
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await releaseService.publish(1);

      // Category (relation target) must be published before Article (relation source)
      const categoryIndex = documentsCallOrder.indexOf(CATEGORY_UID);
      const articleIndex = documentsCallOrder.indexOf(ARTICLE_UID);
      expect(categoryIndex).toBeGreaterThanOrEqual(0);
      expect(articleIndex).toBeGreaterThanOrEqual(0);
      expect(categoryIndex).toBeLessThan(articleIndex);
    });

    it('publishes in dependency order when relation is in a component', async () => {
      const ARTICLE_UID = 'api::article.article';
      const CATEGORY_UID = 'api::category.category';
      const BLOCK_UID = 'basic.block';

      mockExecute.mockReturnValueOnce({ id: 1, releasedAt: null });

      const documentsCallOrder: string[] = [];
      const documentsMock = jest.fn((contentType: string) => {
        documentsCallOrder.push(contentType);
        return {
          findFirst: jest.fn().mockReturnValue({ id: 1 }),
          publish: mockPublish,
          unpublish: mockUnpublish,
        };
      });

      const blockComponent = {
        info: { displayName: 'Block' },
        attributes: {
          category: { type: 'relation', target: CATEGORY_UID },
        },
      };

      const articleModel = {
        info: { displayName: 'Article' },
        options: { draftAndPublish: true },
        attributes: {
          block: { type: 'component', component: BLOCK_UID },
        },
      };

      const categoryModel = {
        info: { displayName: 'Category' },
        options: { draftAndPublish: true },
        attributes: {},
      };

      const getModelMock = jest.fn((uid: string) => {
        if (uid === ARTICLE_UID) return articleModel;
        if (uid === CATEGORY_UID) return categoryModel;
        if (uid === BLOCK_UID) return blockComponent;
        return null;
      });

      const strapiMock = {
        ...baseStrapiMock,
        getModel: getModelMock,
        contentTypes: {
          [ARTICLE_UID]: {},
          [CATEGORY_UID]: {},
        },
        components: {
          [BLOCK_UID]: blockComponent,
        },
        documents: documentsMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockImplementation((modelUid: string) => {
            if (modelUid === 'plugin::content-releases.release-action') {
              return {
                findMany: jest.fn().mockResolvedValue([
                  { contentType: ARTICLE_UID, type: 'publish', entryDocumentId: 'doc1' },
                  { contentType: CATEGORY_UID, type: 'publish', entryDocumentId: 'doc2' },
                ]),
              };
            }
            return {
              update: jest
                .fn()
                .mockResolvedValue({ id: 1, status: 'done', releasedAt: new Date() }),
            };
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await releaseService.publish(1);

      // Category must be published before Article (relation is in Article's component)
      const categoryIndex = documentsCallOrder.indexOf(CATEGORY_UID);
      const articleIndex = documentsCallOrder.indexOf(ARTICLE_UID);
      expect(categoryIndex).toBeGreaterThanOrEqual(0);
      expect(articleIndex).toBeGreaterThanOrEqual(0);
      expect(categoryIndex).toBeLessThan(articleIndex);
    });

    it('publishes documents within a content type sequentially', async () => {
      const PAGE_UID = 'api::page.page';

      mockExecute.mockReturnValueOnce({ id: 1, releasedAt: null });

      const callOrder: string[] = [];
      let resolveFirst: () => void;
      const firstPublishGate = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      const publishMock = jest
        .fn()
        .mockImplementationOnce(async (params: { documentId: string }) => {
          callOrder.push(`call:${params.documentId}`);
          await firstPublishGate;
          callOrder.push(`resolve:${params.documentId}`);
        })
        .mockImplementationOnce(async (params: { documentId: string }) => {
          callOrder.push(`call:${params.documentId}`);
          callOrder.push(`resolve:${params.documentId}`);
        });

      const pageModel = {
        info: { displayName: 'Page' },
        options: { draftAndPublish: true },
        attributes: {
          parent: { type: 'relation', target: PAGE_UID },
        },
      };

      const strapiMock = {
        ...baseStrapiMock,
        getModel: jest.fn(() => pageModel),
        contentTypes: { [PAGE_UID]: {} },
        documents: jest.fn(() => ({
          findFirst: jest.fn().mockReturnValue({ id: 1 }),
          publish: publishMock,
          unpublish: mockUnpublish,
        })),
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockImplementation((modelUid: string) => {
            if (modelUid === 'plugin::content-releases.release-action') {
              return {
                findMany: jest.fn().mockResolvedValue([
                  { contentType: PAGE_UID, type: 'publish', entryDocumentId: 'parentDoc' },
                  { contentType: PAGE_UID, type: 'publish', entryDocumentId: 'childDoc' },
                ]),
              };
            }
            return {
              update: jest
                .fn()
                .mockResolvedValue({ id: 1, status: 'done', releasedAt: new Date() }),
            };
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const publishComplete = releaseService.publish(1);

      for (let i = 0; i < 5; i += 1) {
        await Promise.resolve();
      }

      expect(callOrder).toEqual(['call:parentDoc']);

      resolveFirst!();
      await publishComplete;

      expect(callOrder).toEqual([
        'call:parentDoc',
        'resolve:parentDoc',
        'call:childDoc',
        'resolve:childDoc',
      ]);
    });
  });

  describe('update audit', () => {
    it('reports nothing when the update matched no release', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'March', releasedAt: null }),
            // The release was deleted between the read and the write
            update: jest.fn().mockReturnValue(null),
            count: jest.fn(),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const result = await releaseService.update(1, { name: 'Renamed' }, { user: mockUser });

      expect(result).toBeNull();
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
    });
  });

  describe('publish audit', () => {
    it('records the trigger success with the entry counts', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: null });
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            countActions: jest.fn(({ filters }: { filters: { type: string } }) =>
              Promise.resolve(filters.type === 'publish' ? 2 : 1)
            ),
          }),
        }),
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest
              .fn()
              .mockReturnValue([
                { contentType: 'collectionType', type: 'publish', entry: { id: 1 } },
              ]),
            update: jest.fn(),
          }),
        },
        contentTypes: { collectionType: { kind: 'collectionType' } },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const { counts, countsError } = await releaseService.publish(1);

      expect(counts).toEqual({ published: 2, unpublished: 1 });
      expect(countsError).toBeNull();
      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith('release.trigger', {
        releaseId: 1,
        name: 'March',
        outcome: 'success',
        published: 2,
        unpublished: 1,
      });
    });

    it('keeps the success entry when the counts fail', async () => {
      // The publish committed: an audit-only read failure must not lose its entry
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: null });
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        log: { info: jest.fn(), error: jest.fn() },
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            countActions: jest.fn().mockRejectedValue(new Error('db down')),
          }),
        }),
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest
              .fn()
              .mockReturnValue([
                { contentType: 'collectionType', type: 'publish', entry: { id: 1 } },
              ]),
            update: jest.fn(),
          }),
        },
        contentTypes: { collectionType: { kind: 'collectionType' } },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      // The committed publish must not fail because of an audit-only read: the
      // error travels in the return for the caller to decide
      const { counts, countsError } = await releaseService.publish(1);

      expect(counts).toBeNull();
      expect(countsError).toBeInstanceOf(Error);
      expect(strapiMock.log.error).toHaveBeenCalled();
      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith(
        'release.trigger',
        expect.objectContaining({ outcome: 'success', releaseId: 1 })
      );
    });

    it('records a failed run with only the error name', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: null });
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            // No actions: the run starts and fails inside the service
            findMany: jest.fn().mockReturnValue([]),
            update: jest.fn(),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await expect(releaseService.publish(1)).rejects.toThrow('No entries to publish');
      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith('release.trigger', {
        releaseId: 1,
        name: 'March',
        outcome: 'failure',
        reason: 'ValidationError',
      });
    });

    it('never lets a failing event listener fail the publish', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: null });
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: {
          // Only the audited event's listener fails; the webhook emit is not awaited
          emit: jest.fn((event: string) =>
            event === 'release.trigger'
              ? Promise.reject(new Error('listener boom'))
              : Promise.resolve()
          ),
        },
        log: { info: jest.fn(), error: jest.fn() },
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({ countActions: jest.fn().mockResolvedValue(1) }),
        }),
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest
              .fn()
              .mockReturnValue([
                { contentType: 'collectionType', type: 'publish', entry: { id: 1 } },
              ]),
            update: jest.fn(),
          }),
        },
        contentTypes: { collectionType: { kind: 'collectionType' } },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const { counts } = await releaseService.publish(1);

      expect(counts).toEqual({ published: 1, unpublished: 1 });
      expect(strapiMock.log.error).toHaveBeenCalled();
    });

    it('reports a non-Error throwable as a failed publish', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: null });
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            // A dependency rejecting with a plain string, not an Error
            findMany: jest.fn().mockRejectedValue('boom'),
            update: jest.fn(),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await expect(releaseService.publish(1)).rejects.toThrow('Release publish failed');
      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith(
        'release.trigger',
        expect.objectContaining({ outcome: 'failure', reason: 'Error' })
      );
    });

    it('records nothing for an attempt on an already published release', async () => {
      // The run never starts: not a failed publish, no audit entry
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: '2026-01-01' });
      const strapiMock = { ...baseStrapiMock, eventHub: { emit: jest.fn() } };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await expect(releaseService.publish(1)).rejects.toThrow('Release already published');
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
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
