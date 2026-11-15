import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load, sync } from '../self-referential-relations';

const ID_COLUMN = 'id';
const BATCH_SIZE = 1000;
type RelationData = Parameters<typeof sync>[2];

const createJoinTable = () => ({
  name: 'categories_parent_lnk',
  joinColumn: { name: 'category_id', referencedColumn: 'id' },
  inverseJoinColumn: { name: 'inv_category_id', referencedColumn: 'id' },
  pivotColumns: ['category_id', 'inv_category_id'],
  orderColumnName: 'category_order',
  inverseOrderColumnName: 'inv_category_order',
});

const mockBatchInsert = vi.fn();

// Handles trx(tableName).whereIn(...).select(...) for the idempotency check in sync()
const mockKnexChain = {
  whereIn: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  select: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue(1),
};

const mockTrx = Object.assign(vi.fn().mockReturnValue(mockKnexChain), {
  batchInsert: mockBatchInsert,
});

const createChainedQuery = (result: any[]) => {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.whereIn = vi.fn().mockReturnValue(chain);
  chain.whereNotIn = vi.fn().mockReturnValue(chain);
  chain.transacting = vi.fn().mockResolvedValue(result);
  return chain;
};

const trxContext = { trx: mockTrx };
const createMockTransaction = () => vi.fn(async (cb: any) => cb(trxContext));

describe('self-referential-relations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: load() happy-path SQL correctness (i.e. that whereIn actually filters the right rows)
  // is covered by the API integration test, which runs against a real DB.
  // These unit tests cover the attribute-filtering branches only.
  describe('load', () => {
    it('should skip non-relation and non-self-referential attributes', async () => {
      const chain = createChainedQuery([]);

      (global as any).strapi = {
        db: {
          metadata: {
            get: vi.fn().mockReturnValue({
              attributes: {
                name: { type: 'string' },
                other: {
                  type: 'relation',
                  target: 'api::other.other',
                  joinTable: {
                    name: 'other_lnk',
                    joinColumn: { name: 'a' },
                    inverseJoinColumn: { name: 'b' },
                  },
                },
              },
            }),
          },
          transaction: createMockTransaction(),
          getConnection: vi.fn().mockReturnValue(chain),
        },
      };

      const result = await load('api::category.category' as any, [{ id: 10, locale: 'en' }]);

      expect(result).toHaveLength(0);
      expect(chain.transacting).not.toHaveBeenCalled();
    });

    it('should skip relations without join table', async () => {
      (global as any).strapi = {
        db: {
          metadata: {
            get: vi.fn().mockReturnValue({
              attributes: {
                parent: {
                  type: 'relation',
                  target: 'api::category.category',
                },
              },
            }),
          },
          transaction: createMockTransaction(),
          getConnection: vi.fn(),
        },
      };

      const result = await load('api::category.category' as any, [{ id: 10, locale: 'en' }]);

      expect(result).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('should remap and insert self-referential relations with new IDs', async () => {
      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          dialect: { getBatchInsertSize: vi.fn().mockReturnValue(BATCH_SIZE) },
          transaction: createMockTransaction(),
        },
      };

      const sourceEntries = [{ id: 10, locale: 'en' }];
      const targetEntries = [{ id: 20, locale: 'en' }];
      const relationData: RelationData = [
        {
          joinTable: createJoinTable(),
          relations: [{ id: 1, category_id: 10, inv_category_id: 10, field_order: 1 }],
        },
      ];

      await sync(sourceEntries, targetEntries, relationData);

      expect(mockBatchInsert).toHaveBeenCalledWith(
        'categories_parent_lnk',
        [{ category_id: 20, inv_category_id: 20, field_order: 1 }],
        1000
      );
    });

    it('should skip relations where source or target cannot be mapped', async () => {
      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          dialect: { getBatchInsertSize: vi.fn().mockReturnValue(BATCH_SIZE) },
          transaction: createMockTransaction(),
        },
      };

      const sourceEntries = [{ id: 10, locale: 'en' }];
      const targetEntries = [{ id: 20, locale: 'en' }];
      const relationData: RelationData = [
        {
          joinTable: createJoinTable(),
          relations: [{ id: 1, category_id: 10, inv_category_id: 99, field_order: 1 }],
        },
      ];

      await sync(sourceEntries, targetEntries, relationData);

      expect(mockBatchInsert).not.toHaveBeenCalled();
    });

    it('should handle multiple locales', async () => {
      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          dialect: { getBatchInsertSize: vi.fn().mockReturnValue(BATCH_SIZE) },
          transaction: createMockTransaction(),
        },
      };

      const sourceEntries = [
        { id: 10, locale: 'en' },
        { id: 11, locale: 'fr' },
      ];
      const targetEntries = [
        { id: 20, locale: 'en' },
        { id: 21, locale: 'fr' },
      ];
      const relationData: RelationData = [
        {
          joinTable: createJoinTable(),
          relations: [
            { id: 1, category_id: 10, inv_category_id: 10, field_order: 1 },
            { id: 2, category_id: 11, inv_category_id: 11, field_order: 1 },
          ],
        },
      ];

      await sync(sourceEntries, targetEntries, relationData);

      expect(mockBatchInsert).toHaveBeenCalledWith(
        'categories_parent_lnk',
        [
          { category_id: 20, inv_category_id: 20, field_order: 1 },
          { category_id: 21, inv_category_id: 21, field_order: 1 },
        ],
        1000
      );
    });

    it('should restore order columns when a remapped relation already exists', async () => {
      mockKnexChain.select.mockResolvedValueOnce([{ category_id: 20, inv_category_id: 99 }]);

      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          dialect: { getBatchInsertSize: vi.fn().mockReturnValue(BATCH_SIZE) },
          transaction: createMockTransaction(),
        },
      };

      const sourceEntries = [
        { id: 10, locale: 'en' },
        { id: 11, locale: 'en' },
      ];
      const targetEntries = [{ id: 20, locale: 'en' }];
      const relationData: RelationData = [
        {
          joinTable: createJoinTable(),
          relations: [
            {
              id: 1,
              category_id: 10,
              inv_category_id: 99,
              category_order: 2,
              non_order_column: 'ignored',
            },
          ],
          remap: { source: true, target: false },
        },
      ];

      await sync(sourceEntries, targetEntries, relationData);

      expect(mockKnexChain.where).toHaveBeenCalledWith({
        category_id: 20,
        inv_category_id: 99,
      });
      expect(mockKnexChain.update).toHaveBeenCalledWith({ category_order: 2 });
      expect(mockBatchInsert).not.toHaveBeenCalled();
    });

    it('should restore order columns when only the target side is remapped', async () => {
      mockKnexChain.select.mockResolvedValueOnce([{ category_id: 99, inv_category_id: 20 }]);

      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          dialect: { getBatchInsertSize: vi.fn().mockReturnValue(BATCH_SIZE) },
          transaction: createMockTransaction(),
        },
      };

      const sourceEntries = [{ id: 10, locale: 'en' }];
      const targetEntries = [{ id: 20, locale: 'en' }];
      const relationData: RelationData = [
        {
          joinTable: createJoinTable(),
          relations: [
            {
              id: 1,
              category_id: 99,
              inv_category_id: 10,
              inv_category_order: 2,
              non_order_column: 'ignored',
            },
          ],
          remap: { source: false, target: true },
        },
      ];

      await sync(sourceEntries, targetEntries, relationData);

      expect(mockKnexChain.where).toHaveBeenCalledWith({
        category_id: 99,
        inv_category_id: 20,
      });
      expect(mockKnexChain.update).toHaveBeenCalledWith({ inv_category_order: 2 });
      expect(mockBatchInsert).not.toHaveBeenCalled();
    });

    it('should do nothing when relationData is empty', async () => {
      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          transaction: createMockTransaction(),
        },
      };

      await sync([{ id: 10, locale: 'en' }], [{ id: 20, locale: 'en' }], []);

      expect(strapi.db.transaction).not.toHaveBeenCalled();
    });
  });
});
