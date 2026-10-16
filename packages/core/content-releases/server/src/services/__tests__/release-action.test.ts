import { queryParams } from '@strapi/utils';

import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../../constants';
import createReleaseActionService from '../release-action';
import { AlreadyOnReleaseError } from '../validation';
import type * as utils from '../../utils';

const actualGetDraftEntryValidity =
  jest.requireActual<typeof utils>('../../utils').getDraftEntryValidity;
// The real draft check by default; tests of the entry revalidation stub its result
const mockGetDraftEntryValidity = jest.fn(actualGetDraftEntryValidity);

jest.mock('../../utils', () => ({
  ...jest.requireActual<typeof utils>('../../utils'),
  getDraftEntryValidity: (...args: Parameters<typeof utils.getDraftEntryValidity>) =>
    mockGetDraftEntryValidity(...args),
}));

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
    // Action writes run in a transaction; the mock commits right away, so the audit emit goes out
    inTransaction: jest.fn().mockReturnValue(true),
    query: jest.fn().mockReturnValue({
      update: jest.fn(),
    }),
    transaction: jest
      .fn()
      .mockImplementation((fn) =>
        fn
          ? fn({ trx: jest.fn(), onCommit: (cb: () => unknown) => cb() })
          : { commit: jest.fn(), get: jest.fn() }
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
  beforeEach(() => {
    jest.clearAllMocks();
    // Also drops results a test queued but didn't consume
    mockGetDraftEntryValidity.mockReset().mockImplementation(actualGetDraftEntryValidity);
  });

  describe('findPage', () => {
    it('throws an error if the release does not exist', async () => {
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

      await expect(releaseActionService.findPage(1, {})).rejects.toThrow(
        'No release found for id 1'
      );
    });
  });

  describe('create', () => {
    it('creates an action', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
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
      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith(
        'release.entry.add',
        expect.objectContaining({ type: 'publish' })
      );
    });

    it('defers the audit event to the commit inside a transaction', async () => {
      const onCommit = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        db: {
          ...baseStrapiMock.db,
          // The emit waits for the commit of the write's transaction
          inTransaction: jest.fn().mockReturnValue(true),
          transaction: jest.fn((fn: (params: { trx: unknown; onCommit: jest.Mock }) => unknown) =>
            fn({ trx: jest.fn(), onCommit })
          ),
          query: jest.fn().mockReturnValue({
            create: jest.fn().mockReturnValue({ id: 1, type: 'publish' }),
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
            count: jest.fn(),
            update: jest.fn(),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      await releaseActionService.create(1, {
        type: 'publish' as const,
        entryDocumentId: '1',
        contentType: 'api::contentTypeA.contentTypeA' as const,
      });

      // The emit waits for the commit: a rollback must leave no audit row
      expect(onCommit).toHaveBeenCalled();
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();

      // Firing the registered callback emits it
      await onCommit.mock.calls[0][0]();
      expect(strapiMock.eventHub.emit).toHaveBeenCalledWith(
        'release.entry.add',
        expect.objectContaining({ type: 'publish' })
      );
    });

    it("points a single type's action at its document, without changing the request", async () => {
      const actionCreate = jest.fn(({ data }) => ({ id: 1, ...data }));
      const strapiMock = {
        ...baseStrapiMock,
        contentType: jest.fn(() => ({ uid: 'api::homepage.homepage', kind: 'singleType' })),
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            create: actionCreate,
            // The single type's document, then the release
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test', documentId: 'homepage-doc' }),
          }),
        },
      };
      const request = {
        type: 'unpublish' as const,
        contentType: 'api::homepage.homepage' as const,
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });
      const action = await releaseActionService.create(1, request);

      expect(action).toMatchObject({ entryDocumentId: 'homepage-doc' });
      expect(request).toEqual({ type: 'unpublish', contentType: 'api::homepage.homepage' });
    });

    it('throws an error if the release does not exist', async () => {
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

      await expect(releaseActionService.create(1, mockActionArgs)).rejects.toThrow(
        'No release found for id 1'
      );
    });

    it('throws an error if the release is already published', async () => {
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

      await expect(releaseActionService.create(1, mockActionArgs)).rejects.toThrow(
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
          }),
        }),
        localization: {
          getLocales: jest.fn().mockResolvedValue([
            { name: 'English (en)', code: 'en' },
            { name: 'French (fr)', code: 'fr' },
          ]),
        },
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

    it('should not resolve action locales without a localization plugin', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            findConfiguration: jest.fn().mockReturnValue({ settings: { mainField: 'name' } }),
          }),
        }),
        // Inert default of `strapi.localization` when no provider is registered
        localization: {
          getLocales: jest.fn().mockResolvedValue([]),
        },
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
          locale: null,
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
      const groupedData = await releaseActionService.groupActions(mockActions, 'locale');

      expect(groupedData).toStrictEqual({
        'No locale': [
          {
            id: 1,
            contentType: {
              displayName: 'contentTypeA',
              mainFieldValue: 'test 1',
              uid: 'api::contentTypeA.contentTypeA',
            },
            locale: undefined,
            entryDocumentId: '1',
            entry: {
              name: 'test 1',
              publishedAt: '2021-01-01',
            },
          },
          {
            id: 2,
            contentType: {
              displayName: 'contentTypeB',
              mainFieldValue: 'test 2',
              uid: 'api::contentTypeB.contentTypeB',
            },
            locale: null,
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
          ...baseStrapiMock.db,
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

    it('throws an error if the release does not exist', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnValue(null),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      await expect(releaseActionService.delete(1, 1)).rejects.toThrow(
        'Action with id 1 not found in release with id 1 or it is already published'
      );
    });
  });

  describe('createMany', () => {
    it('skips entries already in the release and recalculates the status once', async () => {
      const actionCreate = jest.fn(({ data }) => ({ id: 1, ...data }));
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            create: actionCreate,
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
          }),
        },
      };
      const { validateUniqueEntry } = serviceMock['release-validation'];
      validateUniqueEntry
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new AlreadyOnReleaseError('already in the release'));

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });
      const result = await releaseActionService.createMany(1, [
        {
          type: 'unpublish',
          entryDocumentId: 'new',
          contentType: 'api::contentTypeA.contentTypeA',
        },
        {
          type: 'unpublish',
          entryDocumentId: 'dup',
          contentType: 'api::contentTypeA.contentTypeA',
        },
      ]);

      expect(result).toEqual({
        created: [expect.objectContaining({ entryDocumentId: 'new' })],
        alreadyInRelease: 1,
      });
      expect(actionCreate).toHaveBeenCalledTimes(1);
      expect(serviceMock.release.updateReleaseStatus.mock.calls).toStrictEqual([[1]]);
    });

    it('fails the whole batch on any other error', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({ create: jest.fn(), findOne: jest.fn() }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      await expect(
        releaseActionService.createMany(1, [
          {
            type: 'unpublish',
            entryDocumentId: 'a',
            contentType: 'api::contentTypeA.contentTypeA',
          },
        ])
      ).rejects.toThrow('No release found for id 1');
      expect(serviceMock.release.updateReleaseStatus).not.toHaveBeenCalled();
    });
  });

  describe('deleteEntryActions', () => {
    it("deletes the entry's actions from planned releases only and recalculates their status", async () => {
      const releaseFindMany = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const actionDeleteMany = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn((uid: string) =>
            uid === RELEASE_MODEL_UID
              ? { findMany: releaseFindMany }
              : { deleteMany: actionDeleteMany }
          ),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });
      const entry = {
        contentType: 'api::contentTypeA.contentTypeA' as const,
        entryDocumentId: 'doc-1',
        locale: 'en',
      };

      await releaseActionService.deleteEntryActions(entry);

      expect(releaseFindMany).toHaveBeenCalledWith({
        where: { releasedAt: { $null: true }, actions: entry },
      });
      expect(actionDeleteMany.mock.calls).toStrictEqual([
        [{ where: { ...entry, release: { releasedAt: { $null: true } } } }],
      ]);
      expect(serviceMock.release.updateReleaseStatus.mock.calls).toStrictEqual([[1], [2]]);
    });
  });

  describe('revalidateEntryActions', () => {
    const UID = 'api::contentTypeA.contentTypeA' as const;
    const INVALID = {
      isEntryValid: false,
      reason: { validation: { errors: [{ path: ['title'], message: 'title is required' }] } },
    };
    // The entry's actions in planned releases that no run recorded
    const PLANNED = {
      contentType: UID,
      entryDocumentId: 'doc-1',
      locale: 'en',
      outcome: null,
      release: { releasedAt: { $null: true } },
    };

    const revalidate = async ({
      plannedReleases,
      publishActions,
    }: {
      plannedReleases: { id: number }[];
      publishActions: number;
    }) => {
      const actionUpdateMany = jest.fn();
      const actionCount = jest.fn().mockResolvedValue(publishActions);
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn((uid: string) =>
            uid === RELEASE_ACTION_MODEL_UID
              ? { count: actionCount, updateMany: actionUpdateMany }
              : { findMany: jest.fn().mockResolvedValue(plannedReleases) }
          ),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });
      await releaseActionService.revalidateEntryActions(UID, {
        id: 1,
        documentId: 'doc-1',
        locale: 'en',
      });

      return { actionCount, actionUpdateMany };
    };

    it('skips the draft read when the entry is in no planned release', async () => {
      const { actionUpdateMany } = await revalidate({ plannedReleases: [], publishActions: 1 });

      expect(mockGetDraftEntryValidity).not.toHaveBeenCalled();
      expect(actionUpdateMany).not.toHaveBeenCalled();
    });

    it('skips the draft read when the entry only has unpublish actions', async () => {
      const { actionUpdateMany } = await revalidate({
        plannedReleases: [{ id: 1 }],
        publishActions: 0,
      });

      expect(mockGetDraftEntryValidity).not.toHaveBeenCalled();
      expect(actionUpdateMany.mock.calls).toStrictEqual([
        [
          {
            where: { ...PLANNED, type: 'unpublish', isEntryValid: false },
            data: { isEntryValid: true, reason: null },
          },
        ],
      ]);
    });

    it("stores the draft's validity and reason on publish actions a run hasn't recorded", async () => {
      mockGetDraftEntryValidity.mockResolvedValueOnce(INVALID);
      const { actionCount, actionUpdateMany } = await revalidate({
        plannedReleases: [{ id: 1 }, { id: 2 }],
        publishActions: 1,
      });

      expect(actionCount).toHaveBeenCalledWith({ where: { ...PLANNED, type: 'publish' } });
      expect(mockGetDraftEntryValidity).toHaveBeenCalledWith(
        { contentType: UID, documentId: 'doc-1', locale: 'en' },
        expect.anything()
      );
      expect(actionUpdateMany.mock.calls).toStrictEqual([
        [{ where: { ...PLANNED, type: 'publish' }, data: INVALID }],
        [
          {
            where: { ...PLANNED, type: 'unpublish', isEntryValid: false },
            data: { isEntryValid: true, reason: null },
          },
        ],
      ]);
      expect(serviceMock.release.updateReleaseStatus.mock.calls).toStrictEqual([[1], [2]]);
    });
  });

  describe('update', () => {
    it('updates the action', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
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

    it('reports nothing when the update matched no action', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findOne: jest.fn().mockReturnValue({ id: 1, type: 'publish' }),
            // The release was published or the action deleted between read and write
            update: jest.fn().mockReturnValue(null),
            count: jest.fn(),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      const result = await releaseActionService.update(1, 1, { type: 'unpublish' });

      expect(result).toBeNull();
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
    });

    it('throws an error if the release does not exist or was already published', async () => {
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

      await expect(releaseActionService.update(1, 1, { type: 'publish' })).rejects.toThrow(
        'Action with id 1 not found in release with id 1 or it is already published'
      );
    });
  });
});
