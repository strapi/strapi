import { queryParams } from '@strapi/utils';

import createReleaseActionService from '../release-action';
import type { ReleaseActionService } from '../release-action';
import { AlreadyOnReleaseError } from '../validation';
import type * as utils from '../../utils';
import { PLANNED_ACTION_WHERE } from '../../utils/action-filters';

const actualGetValidityForActions =
  jest.requireActual<typeof utils>('../../utils').getValidityForActions;
// The real draft checks by default; tests of the planned-action revalidation stub their result
const mockGetValidityForActions = jest.fn(actualGetValidityForActions);

jest.mock('../../utils', () => ({
  ...jest.requireActual<typeof utils>('../../utils'),
  getValidityForActions: (...args: Parameters<typeof utils.getValidityForActions>) =>
    mockGetValidityForActions(...args),
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

// The release row, read under its lock: each value in turn, then the last one
const lockedRelease = (...releases: unknown[]) => {
  const execute = jest.fn();
  releases.forEach((release) => execute.mockResolvedValueOnce(release));
  execute.mockResolvedValue(releases[releases.length - 1]);

  return jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    forUpdate: jest.fn().mockReturnThis(),
    execute,
  });
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
    // Runs the callback as is: rolling back is the database's job, covered by the API tests
    savepoint: jest.fn((cb: () => unknown) => cb()),
    queryBuilder: lockedRelease({ id: 1, name: 'test', releasedAt: null }),
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
    mockGetValidityForActions.mockReset().mockImplementation(actualGetValidityForActions);
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

    describe('a filter', () => {
      const setup = () => {
        const findPage = jest
          .fn()
          .mockResolvedValue({ results: [], pagination: { page: 1, pageSize: 10 } });
        const transformer = queryParams.createTransformer({
          getModel: () => ({
            uid: 'plugin::content-releases.release-action',
            attributes: { outcome: { type: 'enumeration' } },
          }),
        } as any);
        const strapiMock = {
          ...baseStrapiMock,
          get: () => ({ transform: transformer.transformQueryParams }),
          db: {
            ...baseStrapiMock.db,
            query: jest.fn().mockReturnValue({
              findOne: jest.fn().mockResolvedValue({ id: 1 }),
              findPage,
            }),
          },
        };

        // @ts-expect-error Ignore missing properties
        const releaseActionService = createReleaseActionService({ strapi: strapiMock });

        return { releaseActionService, findPage };
      };

      it('narrows the actions of the release, never the release itself', async () => {
        const { releaseActionService, findPage } = setup();

        await releaseActionService.findPage(1, { filter: 'notReady', page: 2 });

        const [params] = findPage.mock.calls[0];
        expect(params).not.toHaveProperty('filter');
        expect(params.where).toEqual({
          release: 1,
          type: 'publish',
          $or: [{ isEntryValid: false }, { isEntryValid: { $null: true } }],
        });
        expect(params.page).toBe(2);
      });

      it('lists every action of the release without one', async () => {
        const { releaseActionService, findPage } = setup();

        await releaseActionService.findPage(1, {});

        expect(findPage.mock.calls[0][0].where).toEqual({ release: 1 });
      });

      it('narrows a filter further with any other filter on the actions', async () => {
        const { releaseActionService, findPage } = setup();

        await releaseActionService.findPage(1, {
          filter: 'skipped',
          filters: { outcome: 'skipped_invalid' },
        });

        expect(findPage.mock.calls[0][0].where).toEqual({
          $and: [
            { outcome: 'skipped_invalid' },
            { release: 1, outcome: { $notIn: ['published', 'unpublished'] } },
          ],
        });
      });
    });

    it('lists an action whose content type was deleted after the release ran, without its entry', async () => {
      const action = { id: 1, type: 'publish', contentType: 'api::removed.removed' };
      const strapiMock = {
        ...baseStrapiMock,
        get: () => ({ transform: () => ({}) }),
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue({ id: 1 }),
            findPage: jest.fn().mockResolvedValue({ results: [action], pagination: {} }),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });
      const { results } = await releaseActionService.findPage(1, {});

      expect(results).toEqual([{ ...action, entry: null, status: null }]);
      expect(strapiMock.documents).not.toHaveBeenCalled();
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
        documents: jest.fn(() => ({
          findFirst: jest.fn().mockResolvedValue({ documentId: 'homepage-doc' }),
        })),
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            create: actionCreate,
            findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
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
      const actionCreate = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          queryBuilder: lockedRelease(undefined),
          query: jest.fn().mockReturnValue({ create: actionCreate, findOne: jest.fn() }),
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
      expect(actionCreate).not.toHaveBeenCalled();
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

    it('throws an error if the action is not in the release', async () => {
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
        'Action with id 1 not found in release with id 1'
      );
    });

    it('throws an error if the release does not exist', async () => {
      const actionDelete = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          queryBuilder: lockedRelease(undefined),
          query: jest.fn().mockReturnValue({ delete: actionDelete }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      await expect(releaseActionService.delete(1, 1)).rejects.toThrow('No release found for id 1');
      expect(actionDelete).not.toHaveBeenCalled();
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

    it('fails the whole batch on any error other than an entry already in the release', async () => {
      const actionCreate = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({ create: actionCreate, findOne: jest.fn() }),
        },
      };
      serviceMock['release-validation'].validateEntryData
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('No entry found'));

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      await expect(
        releaseActionService.createMany(1, [
          {
            type: 'unpublish',
            entryDocumentId: 'a',
            contentType: 'api::contentTypeA.contentTypeA',
          },
          {
            type: 'unpublish',
            entryDocumentId: 'b',
            contentType: 'api::contentTypeA.contentTypeA',
          },
        ])
      ).rejects.toThrow('No entry found');
      expect(actionCreate).not.toHaveBeenCalled();
      expect(serviceMock.release.updateReleaseStatus).not.toHaveBeenCalled();
    });

    it('fails on a missing release', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          queryBuilder: lockedRelease(undefined),
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

  describe('changes on a release that ran in between', () => {
    const frozenStrapiMock = (actionWrites: Record<string, jest.Mock>) => ({
      ...baseStrapiMock,
      db: {
        ...baseStrapiMock.db,
        // The release row, read under the lock once the run has committed
        queryBuilder: lockedRelease({ id: 1, name: 'test', releasedAt: new Date() }),
        query: jest.fn().mockReturnValue({
          // Read before the lock: still planned
          findOne: jest.fn().mockReturnValue({ id: 1, name: 'test', type: 'publish' }),
          ...actionWrites,
        }),
      },
    });

    it.each([
      [
        'adding an entry',
        (service: ReleaseActionService) =>
          service.create(1, {
            type: 'unpublish',
            entryDocumentId: '1',
            contentType: 'api::contentTypeA.contentTypeA',
          }),
        'create',
      ],
      [
        'adding entries',
        (service: ReleaseActionService) =>
          service.createMany(1, [
            {
              type: 'unpublish',
              entryDocumentId: '1',
              contentType: 'api::contentTypeA.contentTypeA',
            },
          ]),
        'create',
      ],
      ['removing an entry', (service: ReleaseActionService) => service.delete(1, 1), 'delete'],
      [
        "changing an entry's type",
        (service: ReleaseActionService) => service.update(1, 1, { type: 'unpublish' }),
        'update',
      ],
    ])('%s is refused and writes nothing', async (_, change, write) => {
      const actionWrite = jest.fn();

      const releaseActionService = createReleaseActionService({
        // @ts-expect-error Ignore missing properties
        strapi: frozenStrapiMock({ [write]: actionWrite }),
      });

      await expect(change(releaseActionService)).rejects.toThrow('Release already published');
      expect(actionWrite).not.toHaveBeenCalled();
      expect(serviceMock.release.updateReleaseStatus).not.toHaveBeenCalled();
    });
  });

  describe('revalidatePlannedActions', () => {
    const INVALID = {
      isEntryValid: false,
      reason: { validation: { errors: [{ path: ['title'], message: 'title is required' }] } },
    };

    const setup = (
      actions: { id: number; type: string; isEntryValid?: boolean; release: { id: number } }[]
    ) => {
      const actionFindMany = jest.fn().mockResolvedValue(actions);
      const actionUpdate = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        log: { error: jest.fn() },
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({ findMany: actionFindMany, update: actionUpdate }),
        },
      };
      mockGetValidityForActions.mockImplementationOnce(
        async (found) =>
          new Map(
            found
              .filter((action) => action.type === 'publish')
              .map((action) => [action.id, INVALID])
          )
      );

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      return { releaseActionService, actionFindMany, actionUpdate, strapiMock };
    };

    it("stores each planned action's validity and recalculates each release once", async () => {
      const { releaseActionService, actionUpdate } = setup([
        { id: 1, type: 'publish', release: { id: 10 } },
        { id: 2, type: 'publish', release: { id: 10 } },
        // Stored as invalid by an earlier version: unpublish actions are always publishable
        { id: 3, type: 'unpublish', isEntryValid: false, release: { id: 20 } },
        { id: 4, type: 'unpublish', isEntryValid: true, release: { id: 20 } },
      ]);

      await releaseActionService.revalidatePlannedActions({ contentType: 'api::a.a' });

      // Written by type too, so a type change committed since the read keeps its own validity
      expect(actionUpdate.mock.calls).toStrictEqual([
        [{ where: { id: 1, type: 'publish' }, data: INVALID }],
        [{ where: { id: 2, type: 'publish' }, data: INVALID }],
        [{ where: { id: 3, type: 'unpublish' }, data: { isEntryValid: true, reason: null } }],
      ]);
      expect(serviceMock.release.updateReleaseStatus.mock.calls).toStrictEqual([[10], [20]]);
    });

    it('leaves alone a release that ran or was deleted in between', async () => {
      const { releaseActionService, actionUpdate, strapiMock } = setup([
        { id: 1, type: 'publish', release: { id: 10 } },
        { id: 2, type: 'publish', release: { id: 20 } },
        { id: 3, type: 'publish', release: { id: 30 } },
      ]);
      strapiMock.db.queryBuilder = lockedRelease({ id: 10, releasedAt: new Date() }, undefined, {
        id: 30,
        releasedAt: null,
      });

      await releaseActionService.revalidatePlannedActions({});

      expect(actionUpdate.mock.calls).toStrictEqual([
        [{ where: { id: 3, type: 'publish' }, data: INVALID }],
      ]);
      expect(serviceMock.release.updateReleaseStatus.mock.calls).toStrictEqual([[30]]);
    });

    it('logs a release whose change fails and still changes the others', async () => {
      const { releaseActionService, actionUpdate, strapiMock } = setup([
        { id: 1, type: 'publish', release: { id: 10 } },
        { id: 2, type: 'publish', release: { id: 20 } },
      ]);
      actionUpdate.mockRejectedValueOnce(new Error('write failed'));

      await releaseActionService.revalidatePlannedActions({});

      expect(strapiMock.log.error).toHaveBeenCalledWith(
        'Error while changing the actions of release 10',
        expect.objectContaining({ error: expect.any(Error) })
      );
      expect(actionUpdate).toHaveBeenLastCalledWith({
        where: { id: 2, type: 'publish' },
        data: INVALID,
      });
      expect(serviceMock.release.updateReleaseStatus.mock.calls).toStrictEqual([[20]]);
    });
  });

  describe('entry changes', () => {
    const entry = {
      contentType: 'api::contentTypeA.contentTypeA' as const,
      entryDocumentId: 'doc-1',
      locale: 'en',
    };

    it("deletes the entry's planned actions and recalculates each release once", async () => {
      const actionFindMany = jest.fn().mockResolvedValue([
        { id: 1, release: { id: 10 } },
        { id: 2, release: { id: 10 } },
      ]);
      const actionDeleteMany = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest
            .fn()
            .mockReturnValue({ findMany: actionFindMany, deleteMany: actionDeleteMany }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });
      await releaseActionService.deletePlannedActions(entry);

      expect(actionDeleteMany.mock.calls).toStrictEqual([[{ where: { id: { $in: [1, 2] } } }]]);
      expect(serviceMock.release.updateReleaseStatus.mock.calls).toStrictEqual([[10]]);
    });

    it("removes a content type's actions from planned releases only", async () => {
      const actionFindMany = jest.fn().mockResolvedValue([
        { id: 1, release: { id: 10 } },
        { id: 2, release: { id: 20 } },
      ]);
      const actionDeleteMany = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          ...baseStrapiMock.db,
          query: jest
            .fn()
            .mockReturnValue({ findMany: actionFindMany, deleteMany: actionDeleteMany }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });
      await releaseActionService.deleteContentTypeActions(['api::a.a']);

      // Releases that ran keep them, with what their run recorded
      expect(actionDeleteMany.mock.calls).toStrictEqual([
        [{ where: { id: { $in: [1] } } }],
        [{ where: { id: { $in: [2] } } }],
      ]);
      expect(serviceMock.release.updateReleaseStatus.mock.calls).toStrictEqual([[10], [20]]);
    });

    it('recalculates a release whose locked removal failed once its actions are gone', async () => {
      const actionDeleteMany = jest.fn().mockRejectedValueOnce(new Error('delete failed'));
      const logError = jest.fn();
      const strapiMock = {
        ...baseStrapiMock,
        log: { error: logError },
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findMany: jest.fn().mockResolvedValue([
              { id: 1, release: { id: 10 } },
              { id: 2, release: { id: 20 } },
            ]),
            deleteMany: actionDeleteMany,
          }),
        },
      };
      // The follow-up recalculation fails too: it's logged
      serviceMock.release.updateReleaseStatus
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('status failed'));

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });
      await releaseActionService.deleteContentTypeActions(['api::a.a']);

      expect(actionDeleteMany).toHaveBeenLastCalledWith({
        where: { contentType: { $in: ['api::a.a'] }, ...PLANNED_ACTION_WHERE },
      });
      // Release 20 under its lock, then release 10 after the removal of every planned action
      expect(serviceMock.release.updateReleaseStatus.mock.calls).toStrictEqual([[20], [10]]);
      expect(logError).toHaveBeenCalledWith(
        'Error while updating the status of release 10',
        expect.objectContaining({ error: expect.any(Error) })
      );
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

    it('throws when the action was removed after it was read', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        eventHub: { emit: jest.fn() },
        db: {
          ...baseStrapiMock.db,
          query: jest.fn().mockReturnValue({
            findOne: jest.fn().mockReturnValue({ id: 1, type: 'publish' }),
            // Removed by another request between the read and the locked write
            update: jest.fn().mockReturnValue(null),
            count: jest.fn(),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });

      await expect(releaseActionService.update(1, 1, { type: 'unpublish' })).rejects.toThrow(
        'Action with id 1 not found in release with id 1'
      );
      expect(strapiMock.eventHub.emit).not.toHaveBeenCalled();
    });

    it('throws an error if the action is not in the release', async () => {
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
        'Action with id 1 not found in release with id 1'
      );
    });
  });

  describe('prepareSkippedActions', () => {
    it('leaves out entries that were deleted, or whose content type was deleted or lost D&P', async () => {
      const action = (id: number, contentType: string, documentId: string, locale?: string) => ({
        id,
        type: 'publish',
        contentType,
        entryDocumentId: documentId,
        locale: locale ?? null,
      });
      const skippedActions = [
        action(1, 'api::kept.kept', 'doc-a'),
        action(2, 'api::kept.kept', 'doc-deleted'),
        action(3, 'api::removed.removed', 'doc-b'),
        action(4, 'api::no-dp.no-dp', 'doc-c'),
        action(5, 'api::localized.localized', 'doc-d', 'en'),
        action(6, 'api::localized.localized', 'doc-d', 'fr'),
        // A locale on a content type that isn't localized is ignored
        { ...action(7, 'api::kept.kept', 'doc-e', 'en'), type: 'unpublish' },
      ];
      const entriesByContentType: Record<string, unknown[]> = {
        'api::kept.kept': [{ documentId: 'doc-a' }, { documentId: 'doc-e' }],
        'api::no-dp.no-dp': [{ documentId: 'doc-c' }],
        'api::localized.localized': [{ documentId: 'doc-d', locale: 'en' }],
      };
      const entryFindMany = jest.fn(async (uid: string) => entriesByContentType[uid]);
      const strapiMock = {
        ...baseStrapiMock,
        contentType: jest.fn((uid: string) =>
          uid === 'api::removed.removed'
            ? undefined
            : { uid, options: { draftAndPublish: uid !== 'api::no-dp.no-dp' } }
        ),
        localization: {
          isLocalizedContentType: ({ uid }: { uid: string }) => uid === 'api::localized.localized',
        },
        documents: jest.fn((uid: string) => ({ findMany: () => entryFindMany(uid) })),
        db: {
          ...baseStrapiMock.db,
          query: jest
            .fn()
            .mockReturnValue({ findMany: jest.fn().mockResolvedValue(skippedActions) }),
        },
      };
      const invalid = { isEntryValid: false, reason: { validation: { errors: [] } } };
      mockGetValidityForActions.mockImplementationOnce(
        async (actions) =>
          new Map(
            actions
              .filter((action) => action.type === 'publish')
              .map((action) => [action.id, invalid])
          )
      );

      // @ts-expect-error Ignore missing properties
      const releaseActionService = createReleaseActionService({ strapi: strapiMock });
      const prepared = await releaseActionService.prepareSkippedActions(1);

      expect(prepared).toEqual([
        {
          action: {
            type: 'publish',
            contentType: 'api::kept.kept',
            entryDocumentId: 'doc-a',
            locale: null,
          },
          validity: invalid,
        },
        {
          action: {
            type: 'publish',
            contentType: 'api::localized.localized',
            entryDocumentId: 'doc-d',
            locale: 'en',
          },
          validity: invalid,
        },
        {
          action: {
            type: 'unpublish',
            contentType: 'api::kept.kept',
            entryDocumentId: 'doc-e',
            locale: 'en',
          },
          validity: { isEntryValid: true, reason: null },
        },
      ]);
      // One read per content type that still has D&P
      expect(entryFindMany.mock.calls.map(([uid]) => uid)).toEqual([
        'api::kept.kept',
        'api::localized.localized',
      ]);
    });
  });
});
