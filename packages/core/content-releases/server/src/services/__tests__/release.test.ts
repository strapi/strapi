import { setImmediate } from 'node:timers/promises';

import { errors, queryParams } from '@strapi/utils';
import type { Core } from '@strapi/types';

import createReleaseService from '../release';
import createReleaseActionService from '../release-action';
import type { ReleaseActionService } from '../release-action';
import releaseCT from '../../content-types/release/schema';
import type * as utils from '../../utils';

const PUBLISHABLE = {
  publishable: true,
  outcome: null,
  reason: null,
  error: null,
} satisfies utils.EntryPublishability;

// Every publish action gets `check`'s result
const checkPublishActions = <TAction extends { id: number | string; type: string }>(
  actions: readonly TAction[],
  check: (action: TAction) => utils.EntryPublishability | Error
) =>
  new Map(
    actions
      .filter((action) => action.type === 'publish')
      .map((action) => [action.id, check(action)])
  );
// Typed as the real helper, so a change to its shape breaks this mock at compile time
// instead of at run time. Every publish action is publishable unless a test says otherwise.
const allPublishable: typeof utils.getPublishabilityForActions = async (actions) =>
  checkPublishActions(actions, () => PUBLISHABLE);
const mockGetPublishabilityForActions = jest.fn(allPublishable);

jest.mock('../../utils', () => ({
  ...jest.requireActual<typeof utils>('../../utils'),
  getPublishabilityForActions: (...args: Parameters<typeof utils.getPublishabilityForActions>) =>
    mockGetPublishabilityForActions(...args),
}));

// The release-action service's real validity writes, run against a test's query mock
const storePublishValiditiesWith =
  (query: object) => (validities: Parameters<ReleaseActionService['storePublishValidities']>[0]) =>
    createReleaseActionService({
      strapi: { db: { query: () => query } } as unknown as Core.Strapi,
    }).storePublishValidities(validities);

// What each action was left with by the `updateMany` writes, however they were batched, with the
// action type each write was guarded by
const getUpdatedActions = (updateMany: jest.Mock) =>
  new Map(
    updateMany.mock.calls.flatMap(([{ where, data }]) =>
      where.id.$in.map((id: number) => [id, { type: where.type, ...data }] as const)
    )
  );

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
      forUpdate: jest.fn().mockReturnThis(),
      execute: mockExecute,
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

// The release row, as read under its lock
const lockedReleaseDb = (
  locked: ({ releasedAt: Date | null } & Record<string, unknown>) | undefined,
  queries: Record<string, jest.Mock>
) => ({
  ...baseStrapiMock.db,
  inTransaction: jest.fn(() => false),
  transaction: jest.fn((fn) => fn({ trx: {} })),
  queryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    forUpdate: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(locked),
  }),
  query: jest.fn(() => queries),
});

describe('Release service', () => {
  describe('update', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const setup = (
      locked: ({ releasedAt: Date | null } & Record<string, unknown>) | undefined,
      updated: Record<string, unknown>
    ) => {
      const queries = {
        update: jest.fn().mockResolvedValue(updated),
        updateMany: jest.fn(),
        count: jest.fn(),
      };
      const strapiMock = {
        ...baseStrapiMock,
        db: lockedReleaseDb(locked, queries),
      };

      // @ts-expect-error Ignore missing properties
      return { releaseService: createReleaseService({ strapi: strapiMock }), queries };
    };

    it('updates the release, unscheduled and without a timezone when no schedule is given', async () => {
      const { releaseService, queries } = setup(
        { releasedAt: null, id: 1, name: 'test' },
        { id: 1, name: 'Release name' }
      );

      const release = await releaseService.update(1, { name: 'Release name' }, { user: mockUser });

      expect(release).toEqual({ id: 1, name: 'Release name' });
      expect(queries.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ name: 'Release name', scheduledAt: null, timezone: null }),
      });
    });

    it('throws an error if the release does not exist', async () => {
      const { releaseService, queries } = setup(undefined, {});

      await expect(
        releaseService.update(1, { name: 'Release name' }, { user: mockUser })
      ).rejects.toThrow('No release found for id 1');
      expect(queries.update).not.toHaveBeenCalled();
    });

    it('throws an error, and writes nothing, if the release is already published', async () => {
      const { releaseService, queries } = setup({ releasedAt: new Date() }, {});

      await expect(
        releaseService.update(1, { name: 'Release name' }, { user: mockUser })
      ).rejects.toThrow('Release already published');
      expect(queries.update).not.toHaveBeenCalled();
      expect(mockSchedulingSet).not.toHaveBeenCalled();
    });

    it('throws a not found error, and reports nothing, if the write matched no release', async () => {
      const { releaseService } = setup({ releasedAt: null, id: 1, name: 'test' }, null as never);

      await expect(
        releaseService.update(1, { name: 'Release name' }, { user: mockUser })
      ).rejects.toThrow('No release found for id 1');
      expect(mockSchedulingSet).not.toHaveBeenCalled();
    });

    it('should set scheduling if scheduledAt is present', async () => {
      const scheduledDate = new Date();
      const { releaseService } = setup(
        { releasedAt: null, id: 1, name: 'test' },
        { id: 1, name: 'Release name', scheduledAt: scheduledDate }
      );

      const mockReleaseArgs = { name: 'Release name', scheduledAt: scheduledDate };
      const release = await releaseService.update(1, mockReleaseArgs, { user: mockUser });

      expect(release).toEqual({ id: 1, name: 'Release name', scheduledAt: scheduledDate });
      expect(mockSchedulingSet).toHaveBeenCalledWith(1, mockReleaseArgs.scheduledAt);
    });

    it('should remove scheduling if scheduledAt is null', async () => {
      const { releaseService } = setup(
        { releasedAt: null, id: 1, name: 'test', scheduledAt: new Date() },
        { id: 1, name: 'Release name', scheduledAt: null }
      );

      const release = await releaseService.update(
        1,
        { name: 'Release name', scheduledAt: null },
        { user: mockUser }
      );

      expect(release).toEqual({ id: 1, name: 'Release name', scheduledAt: null });
      expect(mockSchedulingCancel).toHaveBeenCalledWith(1);
    });
  });

  describe('publish', () => {
    it('throws an error if the release does not exist', async () => {
      mockExecute.mockReturnValueOnce(null);

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: baseStrapiMock });

      await expect(releaseService.publish(1, { trigger: 'manual' })).rejects.toThrow(
        'No release found for id 1'
      );
    });

    it('throws an error if the release is already published', async () => {
      mockExecute.mockReturnValueOnce({ id: 1, releasedAt: new Date() });

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: baseStrapiMock });

      await expect(releaseService.publish(1, { trigger: 'manual' })).rejects.toThrow(
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
    it('reports nothing when the update changed nothing', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        db: lockedReleaseDb(
          { id: 1, name: 'March', releasedAt: null },
          {
            update: jest.fn().mockResolvedValue({ id: 1, name: 'March', releasedAt: null }),
            updateMany: jest.fn(),
            count: jest.fn(),
          }
        ),
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await releaseService.update(1, { name: 'March' }, { user: mockUser });

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
        checkPublishActions(actions, (action) =>
          action.entryDocumentId === 'invalid'
            ? {
                publishable: false,
                outcome: 'skipped_invalid',
                reason: { validation: { errors: [] } },
                error: new errors.ValidationError('Invalid'),
              }
            : PUBLISHABLE
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

    describe('an entry whose check throws', () => {
      const run = async ({
        releaseCondition,
        trigger,
        entries,
      }: {
        releaseCondition: 'allow_partial' | 'all_or_nothing';
        trigger: 'manual' | 'scheduled';
        entries: ('valid' | 'invalid' | 'unreadable' | 'unreadable-validation')[];
      }) => {
        mockExecute.mockReturnValueOnce({
          id: 1,
          name: 'March',
          releasedAt: null,
          releaseCondition,
        });
        // Every case has an unchecked entry: only an allow_partial release with a valid one isn't
        // blocked. A blocked manual publish is rejected after its status recalculation's lock.
        if (
          trigger === 'manual' &&
          (releaseCondition === 'all_or_nothing' || !entries.includes('valid'))
        ) {
          mockExecute.mockReturnValueOnce({ releasedAt: null, releaseCondition });
        }
        mockGetPublishabilityForActions.mockImplementationOnce(async (actions) =>
          checkPublishActions(actions, (action) => {
            if (action.entryDocumentId === 'unreadable') {
              return new TypeError('connection lost');
            }
            // A check that threw a validation error still couldn't establish the entry's validity
            if (action.entryDocumentId === 'unreadable-validation') {
              return new errors.ValidationError('Lookup failed');
            }
            return action.entryDocumentId === 'invalid'
              ? {
                  publishable: false,
                  outcome: 'skipped_invalid',
                  reason: { validation: { errors: [] } },
                  error: new errors.ValidationError('Invalid entry'),
                }
              : PUBLISHABLE;
          })
        );
        const publish = jest.fn();
        const actionUpdate = jest.fn(async ({ data }) => ({ id: 1, name: 'March', ...data }));
        const actionUpdateMany = jest.fn();
        const actionQuery = {
          findMany: jest.fn().mockReturnValue(
            entries.map((entryDocumentId, index) => ({
              id: index + 1,
              contentType: 'collectionType',
              type: 'publish',
              entryDocumentId,
            }))
          ),
          update: actionUpdate,
          updateMany: actionUpdateMany,
        };
        const strapiMock = {
          ...baseStrapiMock,
          eventHub: { emit: jest.fn() },
          log: { info: jest.fn(), warn: jest.fn() },
          documents: jest.fn().mockReturnValue({ publish, unpublish: jest.fn() }),
          plugin: jest.fn().mockReturnValue({
            service: jest.fn().mockReturnValue({
              countActions: jest.fn().mockResolvedValue(entries.length),
              storePublishValidities: storePublishValiditiesWith(actionQuery),
            }),
          }),
          db: {
            ...baseStrapiMock.db,
            savepoint: jest.fn((cb: () => unknown) => cb()),
            query: jest.fn().mockReturnValue(actionQuery),
          },
          contentTypes: { collectionType: { kind: 'collectionType' } },
        };

        // @ts-expect-error Ignore missing properties
        const releaseService = createReleaseService({ strapi: strapiMock });
        const result = await releaseService.publish(1, { trigger }).then(
          (release) => ({ release }),
          (error: Error) => ({ error })
        );

        return {
          result,
          publish,
          actionUpdate,
          actionUpdateMany,
          strapiMock,
        };
      };

      const UNCHECKED = {
        outcome: 'skipped_error',
        reason: { error: { name: 'TypeError' } },
        isEntryValid: false,
      };

      // A rejected publish still stores the check, so the release reads blocked
      const RECALCULATED_AS_BLOCKED = { where: { id: 1 }, data: { status: 'blocked' } };

      it('allow_partial: is skipped as an error, and the others still go out', async () => {
        const { result, publish, actionUpdate } = await run({
          releaseCondition: 'allow_partial',
          trigger: 'manual',
          entries: ['valid', 'unreadable'],
        });

        expect(result).toMatchObject({ release: { status: 'partial' } });
        expect(publish).toHaveBeenCalledTimes(1);
        expect(actionUpdate).toHaveBeenCalledWith({ where: { id: 2 }, data: UNCHECKED });
      });

      it('records a check that threw a validation error as unchecked, not invalid', async () => {
        const { result, actionUpdate } = await run({
          releaseCondition: 'allow_partial',
          trigger: 'scheduled',
          entries: ['valid', 'unreadable-validation'],
        });

        expect(result).toMatchObject({ release: { status: 'partial' } });
        expect(actionUpdate).toHaveBeenCalledWith({
          where: { id: 2 },
          // An application error's message is meant for the client: kept
          data: {
            ...UNCHECKED,
            reason: { error: { name: 'ValidationError', message: 'Lookup failed' } },
          },
        });
      });

      it('all_or_nothing, scheduled: fails the run and holds back the others', async () => {
        const { result, publish, actionUpdate, actionUpdateMany } = await run({
          releaseCondition: 'all_or_nothing',
          trigger: 'scheduled',
          entries: ['valid', 'unreadable'],
        });

        expect(result).toMatchObject({ error: { name: 'TypeError' } });
        expect(publish).not.toHaveBeenCalled();
        expect(actionUpdate).toHaveBeenCalledWith({ where: { id: 2 }, data: UNCHECKED });
        expect(actionUpdateMany).toHaveBeenCalledWith({
          where: { id: { $in: [1] } },
          data: { outcome: 'skipped_held', reason: null, isEntryValid: true },
        });
      });

      it.each([
        ['all_or_nothing', ['invalid', 'unreadable']],
        ['allow_partial', ['invalid', 'unreadable']],
        ['all_or_nothing', ['unreadable', 'invalid']],
        ['all_or_nothing', ['unreadable-validation', 'invalid']],
      ] as const)(
        "%s, manual, blocked: is refused with the invalid entry's error and records no run",
        async (releaseCondition, entries) => {
          const { result, publish, actionUpdate, actionUpdateMany, strapiMock } = await run({
            releaseCondition,
            trigger: 'manual',
            entries: [...entries],
          });

          expect(result).toMatchObject({ error: { message: 'Invalid entry' } });
          expect(publish).not.toHaveBeenCalled();
          // Only each entry's check is stored, on publish actions only: no outcome, so no run
          const reasons = {
            invalid: { validation: { errors: [] } },
            unreadable: { error: { name: 'TypeError' } },
            'unreadable-validation': {
              error: { name: 'ValidationError', message: 'Lookup failed' },
            },
          };
          expect(getUpdatedActions(actionUpdateMany)).toStrictEqual(
            new Map(
              entries.map((entry, index) => [
                index + 1,
                { type: 'publish', isEntryValid: false, reason: reasons[entry] },
              ])
            )
          );
          expect(actionUpdate).toHaveBeenCalledWith(RECALCULATED_AS_BLOCKED);
          expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
        }
      );

      it.each([
        ['all_or_nothing', ['valid', 'unreadable'], 'TypeError'],
        ['allow_partial', ['unreadable'], 'TypeError'],
        ['allow_partial', ['unreadable-validation'], 'ValidationError'],
      ] as const)(
        '%s, manual, blocked only by an unchecked entry: is refused as a validation error',
        async (releaseCondition, entries, errorName) => {
          const { result, publish, actionUpdate, strapiMock } = await run({
            releaseCondition,
            trigger: 'manual',
            entries: [...entries],
          });

          // A 400 naming what stopped the check, never its message (it can carry row contents)
          expect(result).toMatchObject({ error: { name: 'ValidationError' } });
          expect('error' in result && result.error.message).toBe(
            `An entry couldn't be checked (${errorName})`
          );
          expect(publish).not.toHaveBeenCalled();
          expect(actionUpdate).toHaveBeenCalledWith(RECALCULATED_AS_BLOCKED);
          expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
        }
      );
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

      // The frozen release comes with the error, telling a failed run from a refused publish
      await expect(releaseService.publish(1, { trigger: 'manual' })).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Publish failed',
        details: { release: { id: 1, status: 'failed' } },
      });
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

    // InnoDB rolls back the whole transaction on a deadlock, the entries released before included
    it.each(['allow_partial', 'all_or_nothing'] as const)(
      '%s: a MySQL deadlock while releasing an entry fails the publish, and records nothing',
      async (releaseCondition) => {
        mockExecute.mockReturnValueOnce({
          id: 1,
          name: 'March',
          releasedAt: null,
          releaseCondition,
        });
        const deadlock = Object.assign(new Error('Deadlock found when trying to get lock'), {
          code: 'ER_LOCK_DEADLOCK',
          errno: 1213,
        });
        const publish = jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(deadlock)
          .mockResolvedValue(undefined);
        const update = jest.fn(async ({ data }) => ({ id: 1, name: 'March', ...data }));
        const updateMany = jest.fn();
        const strapiMock = {
          ...baseStrapiMock,
          eventHub: { emit: jest.fn() },
          log: { info: jest.fn(), warn: jest.fn() },
          documents: jest.fn().mockReturnValue({ publish }),
          db: {
            ...baseStrapiMock.db,
            savepoint: jest.fn((cb: () => unknown) => cb()),
            query: jest.fn().mockReturnValue({
              findMany: jest.fn().mockReturnValue(
                ['a', 'b', 'c'].map((entryDocumentId, index) => ({
                  id: index + 1,
                  contentType: 'collectionType',
                  type: 'publish',
                  entryDocumentId,
                }))
              ),
              update,
              updateMany,
            }),
          },
          contentTypes: { collectionType: { kind: 'collectionType' } },
        };

        // @ts-expect-error Ignore missing properties
        const releaseService = createReleaseService({ strapi: strapiMock });

        await expect(releaseService.publish(1, { trigger: 'scheduled' })).rejects.toBe(deadlock);
        // The run stops there: nothing after it can be kept
        expect(publish).toHaveBeenCalledTimes(2);
        expect(update).not.toHaveBeenCalled();
        expect(updateMany).not.toHaveBeenCalled();
        expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
      }
    );

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
        'Non-Error thrown'
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
      mockExecute
        // The run's lock
        .mockReturnValueOnce({
          id: 1,
          name: 'March',
          releasedAt: null,
          releaseCondition: 'all_or_nothing',
        })
        // The status recalculation's lock
        .mockReturnValueOnce({ releasedAt: null, releaseCondition: 'all_or_nothing' });
      const notPublishableError = new errors.ValidationError('Invalid entry');
      mockGetPublishabilityForActions.mockImplementationOnce(async (actions) =>
        checkPublishActions(actions, (action) =>
          action.entryDocumentId === 'invalid'
            ? {
                publishable: false,
                outcome: 'skipped_invalid',
                reason: { validation: { errors: [] } },
                error: notPublishableError,
              }
            : PUBLISHABLE
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
            storePublishValidities: storePublishValiditiesWith(releaseQuery),
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
      expect(getUpdatedActions(releaseQuery.updateMany)).toStrictEqual(
        new Map<number, unknown>([
          [1, { type: 'publish', isEntryValid: true, reason: null }],
          [2, { type: 'publish', isEntryValid: false, reason: { validation: { errors: [] } } }],
        ])
      );
      expect(releaseQuery.update.mock.calls).toStrictEqual([
        [{ where: { id: 1 }, data: { status: 'blocked' } }],
      ]);
      // Not a run: no releases.publish webhook and no release.trigger audit event
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
    });
  });

  describe('countByStatus', () => {
    it('counts every status in one query, as numbers, 0 for a status no release has', async () => {
      // Postgres returns counts as strings
      const execute = jest.fn().mockResolvedValue([
        { status: 'ready', count: '2' },
        { status: 'done', count: 5 },
      ]);
      const queryBuilder = {
        raw: jest.fn((sql: string) => sql),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        execute,
      };
      const strapiMock = {
        ...baseStrapiMock,
        db: { ...baseStrapiMock.db, queryBuilder: jest.fn(() => queryBuilder) },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(await releaseService.countByStatus()).toEqual({
        ready: 2,
        blocked: 0,
        failed: 0,
        done: 5,
        partial: 0,
        empty: 0,
      });
      expect(execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateReleaseStatus', () => {
    const createStrapiMock = (release: unknown, counts: { total: number; invalid: number }) => {
      const update = jest.fn();
      const countActions = jest.fn(({ filters }) =>
        filters.type === 'publish' ? counts.invalid : counts.total
      );
      // The release row, read under its lock
      const lockedRead = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        first: jest.fn().mockReturnThis(),
        forUpdate: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(release ?? undefined),
      };

      const strapiMock = {
        ...baseStrapiMock,
        plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue({ countActions }) }),
        db: {
          transaction: jest.fn((fn) => fn({ trx: {} })),
          queryBuilder: jest.fn().mockReturnValue(lockedRead),
          query: jest.fn().mockReturnValue({ update }),
        },
      };

      return { strapiMock, update };
    };

    it.each(['done', 'partial', 'failed'])(
      'leaves a frozen %s release untouched, whatever happens to its entries',
      async (status) => {
        const { strapiMock, update } = createStrapiMock(
          { releaseCondition: 'all_or_nothing', releasedAt: new Date(), status },
          { total: 0, invalid: 0 }
        );

        // @ts-expect-error Ignore missing properties
        const releaseService = createReleaseService({ strapi: strapiMock });
        await releaseService.updateReleaseStatus(1);

        expect(update).not.toHaveBeenCalled();
      }
    );

    it('recalculates the status of a planned release', async () => {
      const { strapiMock, update } = createStrapiMock(
        { releaseCondition: 'all_or_nothing', releasedAt: null },
        { total: 3, invalid: 1 }
      );

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });
      await releaseService.updateReleaseStatus(1);

      expect(update.mock.calls).toStrictEqual([
        [{ where: { id: 1 }, data: { status: 'blocked' } }],
      ]);
    });

    it('leaves a release that failed before the upgrade as failed, for the startup freeze', async () => {
      const { strapiMock, update } = createStrapiMock(
        { releaseCondition: 'all_or_nothing', releasedAt: null, status: 'failed' },
        { total: 3, invalid: 0 }
      );

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });
      await releaseService.updateReleaseStatus(1);

      expect(update).not.toHaveBeenCalled();
    });

    it('does nothing for a release that no longer exists', async () => {
      const { strapiMock, update } = createStrapiMock(null, { total: 3, invalid: 1 });

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });
      await releaseService.updateReleaseStatus(1);

      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const setup = (locked: { releasedAt: Date | null } | undefined, stored = {}) => {
      const queries = {
        findOne: jest.fn().mockResolvedValue({ id: 1, name: 'test', actions: [], ...stored }),
        deleteMany: jest.fn(),
        delete: jest.fn().mockResolvedValue({ id: 1, name: 'test' }),
      };
      const strapiMock = { ...baseStrapiMock, db: lockedReleaseDb(locked, queries) };

      // @ts-expect-error Ignore missing properties
      return { releaseService: createReleaseService({ strapi: strapiMock }), queries };
    };

    it('deletes the release and its actions', async () => {
      const { releaseService, queries } = setup({ releasedAt: null }, { actions: [{ id: 5 }] });

      const release = await releaseService.delete(1);

      expect(release).toEqual({ id: 1, name: 'test', actions: [{ id: 5 }] });
      expect(queries.deleteMany).toHaveBeenCalledWith({ where: { id: { $in: [5] } } });
      expect(queries.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws an error if the release does not exist', async () => {
      const { releaseService, queries } = setup(undefined);

      await expect(releaseService.delete(1)).rejects.toThrow('No release found for id 1');
      expect(queries.delete).not.toHaveBeenCalled();
    });

    it('throws an error, and deletes nothing, if the release is already published', async () => {
      const { releaseService, queries } = setup({ releasedAt: new Date() });

      await expect(releaseService.delete(1)).rejects.toThrow('Release already published');
      expect(queries.deleteMany).not.toHaveBeenCalled();
      expect(queries.delete).not.toHaveBeenCalled();
    });

    it('removes the scheduling if the release is scheduled', async () => {
      const { releaseService } = setup({ releasedAt: null }, { scheduledAt: new Date() });

      await releaseService.delete(1);

      expect(mockSchedulingCancel).toHaveBeenCalledWith(1);
    });

    it('does not remove the scheduling if the release is not scheduled', async () => {
      const { releaseService } = setup({ releasedAt: null });

      await releaseService.delete(1);

      expect(mockSchedulingCancel).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDb = (create: jest.Mock) => ({
      query: () => ({ create }),
      inTransaction: () => false,
    });

    it('should set creator fields', async () => {
      const createFn = jest.fn().mockReturnValue({ id: 1, name: 'test' });

      const strapiMock = {
        ...baseStrapiMock,
        db: createDb(createFn),
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

    it('should create a release and audit it', async () => {
      const emit = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit },
        db: createDb(jest.fn().mockReturnValue({ id: 1, name: 'test' })),
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
      expect(emit).toHaveBeenCalledWith('release.create', { releaseId: 1, name: 'test' });
    });

    it('should set scheduling if scheduledAt is present', async () => {
      const scheduledDate = new Date();

      const strapiMock = {
        ...baseStrapiMock,
        db: createDb(
          jest.fn().mockReturnValue({ id: 1, name: 'test', scheduledAt: scheduledDate })
        ),
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

  describe('recordMissedRun', () => {
    const setup = (actionIds: number[]) => {
      const findMany = jest.fn().mockResolvedValue(actionIds.map((id) => ({ id })));
      const updateMany = jest.fn();
      const update = jest.fn(async ({ data }) => ({ id: 1, ...data }));
      const strapi = { db: { query: jest.fn(() => ({ findMany, updateMany, update })) } };

      // @ts-expect-error Ignore missing properties
      const service = createReleaseService({ strapi });

      return { service, findMany, updateMany, update };
    };

    it('marks every entry of a missed release as missed and counts it as skipped', async () => {
      const { service, updateMany, update } = setup([10, 11]);

      const release = await service.recordMissedRun(1, 'missed_schedule');

      expect(updateMany.mock.calls).toStrictEqual([
        [
          {
            where: { id: { $in: [10, 11] }, outcome: null },
            data: { outcome: 'skipped_missed' },
          },
        ],
      ]);
      expect(update).toHaveBeenCalledWith({
        where: { id: 1, releasedAt: null },
        data: {
          status: 'failed',
          releasedAt: expect.any(Date),
          failureReason: 'missed_schedule',
          totalPublishedEntries: 0,
          totalUnpublishedEntries: 0,
          totalSkippedEntries: 2,
        },
      });
      expect(release).toMatchObject({ status: 'failed', totalSkippedEntries: 2 });
    });

    it('freezes an empty missed release as done: nothing could fail, as its run would have', async () => {
      const { service, updateMany, update } = setup([]);

      const release = await service.recordMissedRun(1, 'missed_schedule');

      expect(updateMany).not.toHaveBeenCalled();
      expect(release).toMatchObject({
        status: 'done',
        failureReason: null,
        totalPublishedEntries: 0,
        totalUnpublishedEntries: 0,
        totalSkippedEntries: 0,
      });
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ releasedAt: expect.any(Date) }) })
      );
    });

    it('keeps an empty release that failed before the upgrade failed', async () => {
      const { service } = setup([]);

      expect(await service.recordMissedRun(1, 'failed_before_upgrade')).toMatchObject({
        status: 'failed',
        failureReason: 'failed_before_upgrade',
        totalSkippedEntries: 0,
      });
    });

    it('writes nothing, and returns null, for a release that already ran', async () => {
      const { service, updateMany, update } = setup([10]);
      update.mockResolvedValueOnce(null);

      expect(await service.recordMissedRun(1, 'missed_schedule')).toBeNull();
      expect(updateMany).not.toHaveBeenCalled();
    });
  });
});
