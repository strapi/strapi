import { setImmediate } from 'node:timers/promises';

import { errors, queryParams } from '@strapi/utils';

import createReleaseService from '../release';
import releaseCT from '../../content-types/release/schema';
import type * as utils from '../../utils';

const PUBLISHABLE = {
  publishable: true,
  outcome: null,
  reason: null,
  error: null,
} satisfies utils.EntryPublishability;

// Typed as the real helper, so a change to its shape breaks this mock at compile time
// instead of at run time. Every publish action is publishable unless a test says otherwise.
const allPublishable: typeof utils.getPublishabilityForActions = async (actions) =>
  actions.map((action) => ({ action, publishability: PUBLISHABLE }));
const mockGetPublishabilityForActions = jest.fn(allPublishable);

jest.mock('../../utils', () => ({
  ...jest.requireActual<typeof utils>('../../utils'),
  getPublishabilityForActions: (...args: Parameters<typeof utils.getPublishabilityForActions>) =>
    mockGetPublishabilityForActions(...args),
}));

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
    // Runs the callback as is: rolling back is the database's job, covered by the API tests
    savepoint: jest.fn((cb: () => unknown) => cb()),
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
  documentId: 'user-1',
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
            updateMany: jest.fn(),
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
            updateMany: jest.fn(),
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
            updateMany: jest.fn(),
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

      expect(() => releaseService.publish(1, { trigger: 'manual' })).rejects.toThrow(
        'No release found for id 1'
      );
    });

    it('throws an error if the release is already published', () => {
      mockExecute.mockReturnValueOnce({ id: 1, releasedAt: new Date() });

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: baseStrapiMock });

      expect(() => releaseService.publish(1, { trigger: 'manual' })).rejects.toThrow(
        'Release already published'
      );
    });

    it('freezes a release with 0 actions as done', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, releasedAt: null });
      const update = jest.fn().mockResolvedValue({ id: 1, status: 'done' });

      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest.fn().mockReturnValue([]),
            update,
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await releaseService.publish(1, { trigger: 'scheduled' });

      expect(update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'done', releasedAt: expect.any(Date) }),
      });
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
            update: jest.fn().mockResolvedValue({ id: 1, name: 'March', status: 'done' }),
            updateMany: jest.fn(),
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

      await releaseService.publish(1, { trigger: 'manual' });

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
                updateMany: jest.fn(),
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

      await releaseService.publish(1, { trigger: 'manual' });

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
                updateMany: jest.fn(),
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

      await releaseService.publish(1, { trigger: 'manual' });

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
                updateMany: jest.fn(),
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

      const publishComplete = releaseService.publish(1, { trigger: 'manual' });

      // Let the run go as far as it can while the first publish is held
      await setImmediate();

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
            updateMany: jest.fn(),
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
    it('audits what the run released', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: null });
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest.fn().mockReturnValue([
              { id: 1, contentType: 'collectionType', type: 'publish', entryDocumentId: 'a' },
              { id: 2, contentType: 'collectionType', type: 'publish', entryDocumentId: 'b' },
              { id: 3, contentType: 'collectionType', type: 'unpublish', entryDocumentId: 'c' },
            ]),
            update: jest.fn(async ({ data }) => ({ id: 1, name: 'March', ...data })),
            updateMany: jest.fn(),
          }),
        },
        contentTypes: { collectionType: { kind: 'collectionType' } },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await releaseService.publish(1, { trigger: 'manual' });

      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith('release.trigger', {
        releaseId: 1,
        name: 'March',
        outcome: 'success',
        published: 2,
        unpublished: 1,
        failed: 0,
      });
    });

    it('records an allow_partial run that left entries out as partial, with what it released', async () => {
      mockExecute.mockReturnValueOnce({
        id: 1,
        name: 'March',
        releasedAt: null,
        releaseCondition: 'allow_partial',
      });
      mockGetPublishabilityForActions.mockImplementationOnce(async (actions) =>
        actions.map((action) =>
          action.entryDocumentId === 'invalid'
            ? {
                action,
                publishability: {
                  publishable: false,
                  outcome: 'skipped_invalid',
                  reason: { validation: { errors: [] } },
                  error: new errors.ValidationError('Invalid'),
                },
              }
            : { action, publishability: PUBLISHABLE }
        )
      );
      const publish = jest.fn(async ({ documentId }: { documentId: string }) => {
        if (documentId === 'throws') {
          throw new Error('Publish failed');
        }
      });
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        log: { info: jest.fn(), warn: jest.fn() },
        documents: jest.fn().mockReturnValue({ publish, unpublish: jest.fn() }),
        db: {
          ...baseStrapiMock.db,
          savepoint: jest.fn((cb: () => unknown) => cb()),
          query: jest.fn().mockReturnValue({
            findMany: jest.fn().mockReturnValue(
              ['valid', 'invalid', 'throws'].map((entryDocumentId, index) => ({
                id: index + 1,
                contentType: 'collectionType',
                type: 'publish',
                entryDocumentId,
              }))
            ),
            update: jest.fn(async ({ data }) => ({ id: 1, name: 'March', ...data })),
            updateMany: jest.fn(),
          }),
        },
        contentTypes: { collectionType: { kind: 'collectionType' } },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await releaseService.publish(1, { trigger: 'manual' });

      // The entry that isn't publishable is never attempted; the one that throws had its own savepoint
      expect(publish).toHaveBeenCalledTimes(2);
      expect(strapiMock.db.savepoint).toHaveBeenCalledTimes(2);
      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith(
        'releases.publish',
        expect.objectContaining({ isPublished: true })
      );
      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith('release.trigger', {
        releaseId: 1,
        name: 'March',
        outcome: 'partial',
        published: 1,
        unpublished: 0,
        failed: 2,
      });
    });

    it('rolls the run back when writing its result fails: nothing recorded, sent or audited', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: null });
      const releaseUpdate = jest
        .fn()
        // The entries went out, then writing the release's outcome failed
        .mockRejectedValueOnce(new errors.ApplicationError('Write failed'))
        .mockResolvedValue({});
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest
              .fn()
              .mockReturnValue([
                { id: 1, contentType: 'collectionType', type: 'publish', entryDocumentId: 'a' },
              ]),
            update: releaseUpdate,
            updateMany: jest.fn(),
          }),
        },
        contentTypes: { collectionType: { kind: 'collectionType' } },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await expect(releaseService.publish(1, { trigger: 'manual' })).rejects.toThrow(
        'Write failed'
      );
      expect(releaseUpdate).toHaveBeenCalledTimes(1);
      expect(releaseUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'done', releasedAt: expect.any(Date) }),
      });
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
    });

    it('records a failed all_or_nothing run as failed everywhere, with only the error name', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: null });
      const publish = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new errors.ValidationError('Publish failed'));
      const releaseUpdate = jest.fn(async ({ data }) => ({ id: 1, name: 'March', ...data }));
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        documents: jest.fn().mockReturnValue({ publish }),
        db: {
          ...baseStrapiMock.db,
          savepoint: jest.fn((cb: () => unknown) => cb()),
          query: jest.fn().mockReturnValue({
            findMany: jest.fn().mockReturnValue([
              { id: 1, contentType: 'collectionType', type: 'publish', entryDocumentId: 'a' },
              { id: 2, contentType: 'collectionType', type: 'publish', entryDocumentId: 'b' },
            ]),
            update: releaseUpdate,
            updateMany: jest.fn(),
          }),
        },
        contentTypes: { collectionType: { kind: 'collectionType' } },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await expect(releaseService.publish(1, { trigger: 'manual' })).rejects.toThrow(
        'Publish failed'
      );
      // One savepoint for the run: the entry released before the error is rolled back with it
      expect(strapiMock.db.savepoint).toHaveBeenCalledTimes(1);
      expect(releaseUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'failed', releasedAt: expect.any(Date) }),
      });
      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith(
        'releases.publish',
        expect.objectContaining({ isPublished: false })
      );
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
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest
              .fn()
              .mockReturnValue([
                { contentType: 'collectionType', type: 'publish', entry: { id: 1 } },
              ]),
            update: jest.fn(async ({ data }) => ({ id: 1, name: 'March', ...data })),
            updateMany: jest.fn(),
          }),
        },
        contentTypes: { collectionType: { kind: 'collectionType' } },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const release = await releaseService.publish(1, { trigger: 'manual' });

      expect(release.status).toBe('done');
      expect(strapiMock.log.error).toHaveBeenCalled();
    });

    it('rolls back a read that fails, as an Error, even when a non-Error was thrown', async () => {
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

      await expect(releaseService.publish(1, { trigger: 'manual' })).rejects.toThrow(
        'Release publish failed'
      );
      expect(strapiMock.db.query().update).not.toHaveBeenCalled();
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
    });

    it('records nothing for an attempt on an already published release', async () => {
      // The run never starts: not a failed publish, no audit entry
      mockExecute.mockReturnValueOnce({ id: 1, name: 'March', releasedAt: '2026-01-01' });
      const strapiMock = { ...baseStrapiMock, eventHub: { emit: jest.fn() } };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await expect(releaseService.publish(1, { trigger: 'manual' })).rejects.toThrow(
        'Release already published'
      );
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
    });

    it('records nothing for a manual publish rejected because it would release nothing', async () => {
      mockExecute.mockReturnValueOnce({
        id: 1,
        name: 'March',
        releasedAt: null,
        releaseCondition: 'all_or_nothing',
      });
      const notPublishableError = new errors.ValidationError('Invalid entry');
      mockGetPublishabilityForActions.mockImplementationOnce(async (actions) =>
        actions.map((action) =>
          action.entryDocumentId === 'invalid'
            ? {
                action,
                publishability: {
                  publishable: false,
                  outcome: 'skipped_invalid',
                  reason: { validation: { errors: [] } },
                  error: notPublishableError,
                },
              }
            : { action, publishability: PUBLISHABLE }
        )
      );
      const releaseQuery = {
        findMany: jest.fn().mockReturnValue(
          ['valid', 'invalid'].map((entryDocumentId, index) => ({
            id: index + 1,
            contentType: 'collectionType',
            type: 'publish',
            entryDocumentId,
          }))
        ),
        findOne: jest.fn().mockResolvedValue({ releaseCondition: 'all_or_nothing' }),
        updateMany: jest.fn(),
        update: jest.fn(),
      };
      const publish = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        documents: jest.fn().mockReturnValue({ publish, unpublish: jest.fn() }),
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            // Every action, then the publish actions that aren't publishable
            countActions: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
          }),
        }),
        db: {
          ...baseStrapiMock.db,
          savepoint: jest.fn((cb: () => unknown) => cb()),
          query: jest.fn().mockReturnValue(releaseQuery),
        },
        contentTypes: { collectionType: { kind: 'collectionType' } },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await expect(releaseService.publish(1, { trigger: 'manual' })).rejects.toBe(
        notPublishableError
      );

      // Nothing written to the entries, and the release isn't marked as a run
      expect(strapiMock.db.savepoint).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
      // The check's result is stored, each entry with its reason, so the status reads blocked
      expect(releaseQuery.updateMany).toHaveBeenCalledWith({
        where: { id: { $in: [1] } },
        data: { isEntryValid: true, reason: null },
      });
      expect(releaseQuery.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { isEntryValid: false, reason: { validation: { errors: [] } } },
      });
      expect(releaseQuery.update).toHaveBeenCalledTimes(1);
      expect(releaseQuery.updateMany).toHaveBeenCalledWith({
        where: { id: 1, releasedAt: null },
        data: { status: 'blocked' },
      });
      // Not a run: no releases.publish webhook and no release.trigger audit event
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
    });
  });

  describe('updateReleaseStatus', () => {
    const createStrapiMock = (release: unknown, counts: { total: number; invalid: number }) => {
      const updateMany = jest.fn();
      const countActions = jest.fn(({ filters }) =>
        filters.isEntryValid === false ? counts.invalid : counts.total
      );

      const strapiMock = {
        ...baseStrapiMock,
        plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue({ countActions }) }),
        db: {
          query: jest
            .fn()
            .mockReturnValue({ findOne: jest.fn().mockResolvedValue(release), updateMany }),
        },
      };

      return { strapiMock, updateMany, countActions };
    };

    it.each(['done', 'partial', 'failed'])(
      'leaves a frozen %s release untouched, whatever happens to its entries',
      async (status) => {
        const { strapiMock, updateMany } = createStrapiMock(
          { releaseCondition: 'all_or_nothing', releasedAt: new Date(), status },
          { total: 0, invalid: 0 }
        );

        // @ts-expect-error Ignore missing properties
        const releaseService = createReleaseService({ strapi: strapiMock });
        await releaseService.updateReleaseStatus(1);

        expect(updateMany).not.toHaveBeenCalled();
      }
    );

    it('recalculates the status of a planned release', async () => {
      const { strapiMock, updateMany } = createStrapiMock(
        { releaseCondition: 'all_or_nothing', releasedAt: null },
        { total: 3, invalid: 1 }
      );

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });
      await releaseService.updateReleaseStatus(1);

      expect(updateMany.mock.calls).toStrictEqual([
        [{ where: { id: 1, releasedAt: null }, data: { status: 'blocked' } }],
      ]);
    });

    it('does nothing for a release that no longer exists', async () => {
      const { strapiMock, updateMany } = createStrapiMock(null, { total: 3, invalid: 1 });

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });
      await releaseService.updateReleaseStatus(1);

      expect(updateMany).not.toHaveBeenCalled();
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
