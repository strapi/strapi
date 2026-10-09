import { errors } from '@strapi/utils';

import storeUtils from '../../../services/utils/store';
import { ENABLED_CACHE_TTL_MS, POSITION_ATTRIBUTE } from '../../constants';
import { createCustomOrderService } from '../custom-order';
import { createDocumentMiddleware } from '../document-middleware';
import { computeMove, type MovePlan } from '../utils';

jest.mock('../../../services/utils/store', () => ({
  __esModule: true,
  default: { getAllConfigurations: jest.fn(async () => []) },
}));

jest.mock('../document-middleware', () => ({
  createDocumentMiddleware: jest.fn(() => 'document-middleware'),
}));

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  computeMove: jest.fn(),
}));

const ARTICLE_UID = 'api::article.article';
const PAGE_UID = 'api::page.page';
const SINGLE_UID = 'api::homepage.homepage';

const getAllConfigurations = jest.mocked(storeUtils.getAllConfigurations);

const flushPromises = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

/**
 * Mocks `strapi.db.queryBuilder`: every call returns a new chain that records the methods
 * called on it, and `execute` answers with the next queued result.
 */
const createQueryBuilder = () => {
  const execute = jest.fn();
  const builders: Array<{ uid: string; calls: unknown[][] }> = [];

  const queryBuilder = jest.fn((uid: string) => {
    const calls: unknown[][] = [];
    const chain: Record<string, jest.Mock> = {};

    ['select', 'where', 'first', 'min', 'update', 'increment', 'decrement'].forEach((method) => {
      chain[method] = jest.fn((...args: unknown[]) => {
        calls.push([method, ...args]);
        return chain;
      });
    });
    chain.execute = execute;

    builders.push({ uid, calls });

    return chain;
  });

  return { queryBuilder, execute, builders };
};

/**
 * Mocks the knex connection: chains record their calls and resolve with the next queued
 * result when awaited.
 */
const createKnex = () => {
  const results: unknown[] = [];
  const calls: unknown[][] = [];

  const createChain = (label: string) => {
    const chain: Record<string, unknown> = {};

    [
      'transacting',
      'whereNull',
      'whereNotNull',
      'first',
      'min',
      'max',
      'select',
      'groupBy',
      'as',
      'update',
      'from',
      'where',
    ].forEach((method) => {
      chain[method] = jest.fn((...args: unknown[]) => {
        calls.push([label, method, ...args]);
        return chain;
      });
    });

    chain.then = (resolve: (value: unknown) => void, reject: (error: unknown) => void) =>
      Promise.resolve(results.shift()).then(resolve, reject);

    return chain;
  };

  const table = createChain('table');
  const knex = {
    ref: jest.fn((name: string) => `ref(${name})`),
    raw: jest.fn((sql: string, bindings: unknown[]) => ({ sql, bindings })),
    queryBuilder: jest.fn(() => createChain('sub')),
  };

  return { knex, table, results, calls };
};

const createStrapi = () => {
  const { queryBuilder, execute, builders } = createQueryBuilder();
  const { knex, table, results: knexResults, calls: knexCalls } = createKnex();

  const models: Record<string, boolean> = {
    [ARTICLE_UID]: true,
    [PAGE_UID]: true,
    [SINGLE_UID]: false,
  };

  const strapi = {
    getModel: jest.fn((uid: string) =>
      uid in models
        ? { attributes: models[uid] ? { [POSITION_ATTRIBUTE]: { type: 'integer' } } : {} }
        : undefined
    ),
    db: {
      queryBuilder,
      connection: knex,
      getConnection: jest.fn(() => table),
      transaction: jest.fn(async (fn: (ctx: { trx: string }) => Promise<unknown>) =>
        fn({ trx: 'trx' })
      ),
      metadata: {
        get: jest.fn(() => ({
          tableName: 'articles',
          attributes: {
            [POSITION_ATTRIBUTE]: { type: 'integer' },
            documentId: { type: 'string', columnName: 'document_id' },
          },
        })),
      },
    },
    documents: { use: jest.fn() },
    log: { warn: jest.fn() },
  };

  return { strapi: strapi as any, execute, builders, knex, knexResults, knexCalls };
};

describe('Custom order service', () => {
  let now: jest.SpyInstance<number, []> | undefined;

  beforeEach(() => {
    getAllConfigurations.mockResolvedValue([]);
  });

  afterEach(() => {
    now?.mockRestore();
    now = undefined;
    jest.clearAllMocks();
  });

  describe('isOrderable', () => {
    test('Only content types with the position attribute can be ordered', () => {
      const { strapi } = createStrapi();
      const service = createCustomOrderService({ strapi });

      expect(service.isOrderable(ARTICLE_UID)).toBe(true);
      expect(service.isOrderable(SINGLE_UID)).toBe(false);
      expect(service.isOrderable('api::unknown.unknown')).toBe(false);
    });
  });

  describe('refresh / isEnabled', () => {
    test('Reads which content types have custom order turned on in their list view settings', async () => {
      getAllConfigurations.mockResolvedValue([
        { uid: ARTICLE_UID, settings: { customOrder: true } },
        { uid: PAGE_UID, settings: { customOrder: false } },
        { uid: SINGLE_UID, settings: { customOrder: true } },
        { settings: { customOrder: true } },
      ]);
      const { strapi } = createStrapi();
      const service = createCustomOrderService({ strapi });

      await service.refresh();

      expect(service.isEnabled(ARTICLE_UID)).toBe(true);
      expect(service.isEnabled(PAGE_UID)).toBe(false);
      expect(service.isEnabled(SINGLE_UID)).toBe(false);
    });

    test('Keeps the result of the most recent refresh when two overlap', async () => {
      let resolveFirst: (
        value: Awaited<ReturnType<typeof getAllConfigurations>>
      ) => void = () => {};
      getAllConfigurations
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirst = resolve;
            })
        )
        .mockResolvedValueOnce([{ uid: PAGE_UID, settings: { customOrder: true } }]);
      const { strapi } = createStrapi();
      const service = createCustomOrderService({ strapi });

      const first = service.refresh();
      const second = service.refresh();
      await second;
      resolveFirst([{ uid: ARTICLE_UID, settings: { customOrder: true } }]);
      await first;

      expect(service.isEnabled(PAGE_UID)).toBe(true);
      expect(service.isEnabled(ARTICLE_UID)).toBe(false);
    });

    test('Reads the settings again in the background once they are stale', async () => {
      now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
      getAllConfigurations.mockResolvedValue([
        { uid: ARTICLE_UID, settings: { customOrder: true } },
      ]);
      const { strapi } = createStrapi();
      const service = createCustomOrderService({ strapi });

      await service.refresh();
      expect(getAllConfigurations).toHaveBeenCalledTimes(1);

      // Fresh enough: trusted as is
      now.mockReturnValue(1_000 + ENABLED_CACHE_TTL_MS - 1);
      expect(service.isEnabled(ARTICLE_UID)).toBe(true);
      expect(getAllConfigurations).toHaveBeenCalledTimes(1);

      // Stale: answered from what is known, refreshed in the background, one refresh at a time
      now.mockReturnValue(1_000 + ENABLED_CACHE_TTL_MS);
      getAllConfigurations.mockResolvedValue([]);
      expect(service.isEnabled(ARTICLE_UID)).toBe(true);
      expect(service.isEnabled(ARTICLE_UID)).toBe(true);
      expect(getAllConfigurations).toHaveBeenCalledTimes(2);

      await flushPromises();

      expect(service.isEnabled(ARTICLE_UID)).toBe(false);
      expect(getAllConfigurations).toHaveBeenCalledTimes(2);
    });

    test('Logs a failed background refresh and tries again next time', async () => {
      now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
      const { strapi } = createStrapi();
      const service = createCustomOrderService({ strapi });

      await service.refresh();

      now.mockReturnValue(1_000 + ENABLED_CACHE_TTL_MS);
      const error = new Error('Database unavailable');
      getAllConfigurations.mockRejectedValueOnce(error);

      expect(service.isEnabled(ARTICLE_UID)).toBe(false);
      await flushPromises();

      expect(strapi.log.warn).toHaveBeenCalledWith(
        '[custom-order] Could not refresh the list of ordered content types',
        { error }
      );

      getAllConfigurations.mockResolvedValue([
        { uid: ARTICLE_UID, settings: { customOrder: true } },
      ]);
      expect(service.isEnabled(ARTICLE_UID)).toBe(false);
      await flushPromises();

      expect(service.isEnabled(ARTICLE_UID)).toBe(true);
      expect(getAllConfigurations).toHaveBeenCalledTimes(3);
    });
  });

  describe('getTopPosition', () => {
    test.each([
      [{ min: 3 }, 2],
      [{ min: '3' }, 2],
      [{ min: null }, 0],
      [undefined, 0],
    ])('Finds the position that comes before every other one (%p)', async (row, expected) => {
      const { strapi, execute, builders } = createStrapi();
      execute.mockResolvedValueOnce(row);
      const service = createCustomOrderService({ strapi });

      await expect(service.getTopPosition(ARTICLE_UID)).resolves.toBe(expected);

      expect(builders[0].uid).toBe(ARTICLE_UID);
      expect(builders[0].calls).toEqual([['min', POSITION_ATTRIBUTE], ['first']]);
    });
  });

  describe('syncDocumentPosition', () => {
    test('Gives the rows without position the position of their document', async () => {
      const { strapi, execute, builders } = createStrapi();
      execute.mockResolvedValueOnce({ [POSITION_ATTRIBUTE]: 5 }).mockResolvedValueOnce(undefined);
      const service = createCustomOrderService({ strapi });

      await service.syncDocumentPosition(ARTICLE_UID, 'doc');

      expect(builders[0].calls).toEqual([
        ['select', [POSITION_ATTRIBUTE]],
        ['where', { documentId: 'doc', [POSITION_ATTRIBUTE]: { $notNull: true } }],
        ['first'],
      ]);
      expect(builders[1].calls).toEqual([
        ['update', { [POSITION_ATTRIBUTE]: 5 }],
        ['where', { documentId: 'doc', [POSITION_ATTRIBUTE]: { $null: true } }],
      ]);
    });

    test('Puts a document that has no position at all on top', async () => {
      const { strapi, execute, builders } = createStrapi();
      execute
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ min: 2 })
        .mockResolvedValueOnce(undefined);
      const service = createCustomOrderService({ strapi });

      await service.syncDocumentPosition(ARTICLE_UID, 'doc');

      expect(builders).toHaveLength(3);
      expect(builders[2].calls[0]).toEqual(['update', { [POSITION_ATTRIBUTE]: 1 }]);
    });
  });

  describe('assignMissingPositions', () => {
    test('Does nothing when every row has a position', async () => {
      const { strapi, knex, knexResults, knexCalls } = createStrapi();
      knexResults.push(undefined);
      const service = createCustomOrderService({ strapi });

      await service.assignMissingPositions(ARTICLE_UID);

      expect(strapi.db.transaction).toHaveBeenCalledTimes(1);
      expect(knexCalls).toEqual([
        ['table', 'transacting', 'trx'],
        ['table', 'whereNull', POSITION_ATTRIBUTE],
        ['table', 'first', 'id'],
      ]);
      expect(knex.raw).not.toHaveBeenCalled();
    });

    test('Orders the documents by creation when nothing is ordered yet', async () => {
      const { strapi, knex, knexResults, knexCalls } = createStrapi();
      knexResults.push({ id: 1 }, { min: null }, 1);
      const service = createCustomOrderService({ strapi });

      await service.assignMissingPositions(ARTICLE_UID);

      const updates = knexCalls.filter(([, method]) => method === 'update');
      expect(updates).toHaveLength(1);
      expect(knex.ref).toHaveBeenCalledWith('articles.document_id');
      expect(knex.raw).toHaveBeenCalledTimes(1);
      expect(knex.raw).toHaveBeenCalledWith('(?)', [expect.anything()]);
    });

    test('Puts the documents created while custom order was off on top, most recent first', async () => {
      const { strapi, knex, knexResults, knexCalls } = createStrapi();
      knexResults.push({ id: 7 }, { min: 4 }, 1, 2);
      const service = createCustomOrderService({ strapi });

      await service.assignMissingPositions(ARTICLE_UID);

      const updates = knexCalls.filter(([, method]) => method === 'update');
      expect(updates).toHaveLength(2);
      // Rows of documents that already have a position take it
      expect(knex.raw).toHaveBeenNthCalledWith(1, '(?)', [expect.anything()]);
      // The others go above the current top
      expect(knex.raw).toHaveBeenNthCalledWith(2, '? - (?)', [4, expect.anything()]);
    });
  });

  describe('move', () => {
    const setupMove = ({
      from,
      anchor,
      plan,
    }: {
      from?: number;
      anchor?: number;
      plan: MovePlan | null;
    }) => {
      const { strapi, execute, builders, knexResults } = createStrapi();
      // Every row already has a position
      knexResults.push(undefined);
      execute
        .mockResolvedValueOnce(from === undefined ? undefined : { [POSITION_ATTRIBUTE]: from })
        .mockResolvedValueOnce(anchor === undefined ? undefined : { [POSITION_ATTRIBUTE]: anchor });
      jest.mocked(computeMove).mockReturnValue(plan);
      const service = createCustomOrderService({ strapi });

      return { service, strapi, builders };
    };

    const moveParams = {
      uid: ARTICLE_UID,
      documentId: 'a',
      anchorId: 'b',
      placement: 'after',
    } as const;

    test('Fails when the moved document or the anchor has no position', async () => {
      const { service, builders } = setupMove({ from: 3, anchor: undefined, plan: null });

      await expect(service.move(moveParams)).rejects.toThrow(errors.NotFoundError);
      expect(builders).toHaveLength(2);
    });

    test('Leaves a document that is already in place alone', async () => {
      const { service, strapi, builders } = setupMove({ from: 3, anchor: 2, plan: null });

      await service.move(moveParams);

      // Positions are given to the rows that have none first
      expect(strapi.db.transaction).toHaveBeenCalledTimes(2);
      expect(computeMove).toHaveBeenCalledWith({ from: 3, anchor: 2, placement: 'after' });
      expect(builders).toHaveLength(2);
    });

    test('Shifts the documents in between and places the document', async () => {
      const { service, builders } = setupMove({
        from: 1,
        anchor: 4,
        plan: { position: 4, shift: { from: 2, to: 4, by: -1 } },
      });

      await service.move(moveParams);

      expect(builders[2].calls).toEqual([
        ['where', { [POSITION_ATTRIBUTE]: { $gte: 2, $lte: 4 } }],
        ['decrement', POSITION_ATTRIBUTE],
      ]);
      expect(builders[3].calls).toEqual([
        ['update', { [POSITION_ATTRIBUTE]: 4 }],
        ['where', { documentId: 'a' }],
      ]);
    });

    test('Shifts every document from a position upwards when there is no upper bound', async () => {
      const { service, builders } = setupMove({
        from: 5,
        anchor: 5,
        plan: { position: 5, shift: { from: 5, to: null, by: 1 } },
      });

      await service.move({ ...moveParams, placement: 'before' });

      expect(builders[2].calls).toEqual([
        ['where', { [POSITION_ATTRIBUTE]: { $gte: 5 } }],
        ['increment', POSITION_ATTRIBUTE],
      ]);
      expect(builders[3].calls[0]).toEqual(['update', { [POSITION_ATTRIBUTE]: 5 }]);
    });

    test('Places the document without shifting anything when a slot is free', async () => {
      const { service, builders } = setupMove({
        from: 1,
        anchor: 4,
        plan: { position: 3, shift: null },
      });

      await service.move(moveParams);

      expect(builders).toHaveLength(3);
      expect(builders[2].calls).toEqual([
        ['update', { [POSITION_ATTRIBUTE]: 3 }],
        ['where', { documentId: 'a' }],
      ]);
    });
  });

  describe('bootstrap', () => {
    test('Gives positions to the ordered content types and plugs into the Document Service once', async () => {
      getAllConfigurations.mockResolvedValue([
        { uid: ARTICLE_UID, settings: { customOrder: true } },
        { uid: PAGE_UID, settings: { customOrder: true } },
      ]);
      const { strapi, knexResults } = createStrapi();
      knexResults.push(undefined, undefined);
      const service = createCustomOrderService({ strapi });

      await service.bootstrap();
      await service.bootstrap();

      expect(getAllConfigurations).toHaveBeenCalledTimes(1);
      expect(strapi.db.transaction).toHaveBeenCalledTimes(2);
      expect(createDocumentMiddleware).toHaveBeenCalledTimes(1);
      expect(createDocumentMiddleware).toHaveBeenCalledWith(service);
      expect(strapi.documents.use).toHaveBeenCalledTimes(1);
    });
  });

  describe('applySettings', () => {
    test('Gives positions to the entries when custom order is turned on', async () => {
      getAllConfigurations.mockResolvedValue([
        { uid: ARTICLE_UID, settings: { customOrder: true } },
      ]);
      const { strapi, knexResults } = createStrapi();
      knexResults.push(undefined);
      const service = createCustomOrderService({ strapi });

      await service.applySettings(ARTICLE_UID, { customOrder: true });

      expect(strapi.db.transaction).toHaveBeenCalledTimes(1);
      expect(service.isEnabled(ARTICLE_UID)).toBe(true);
    });

    test('Only reads the settings again when custom order is turned off', async () => {
      const { strapi } = createStrapi();
      const service = createCustomOrderService({ strapi });

      await service.applySettings(ARTICLE_UID, { customOrder: false });
      await service.applySettings(ARTICLE_UID, null);

      expect(strapi.db.transaction).not.toHaveBeenCalled();
      expect(getAllConfigurations).toHaveBeenCalledTimes(2);
    });

    test('Does not give positions to a content type that cannot be ordered', async () => {
      const { strapi } = createStrapi();
      const service = createCustomOrderService({ strapi });

      await service.applySettings(SINGLE_UID, { customOrder: true });

      expect(strapi.db.transaction).not.toHaveBeenCalled();
    });
  });
});
