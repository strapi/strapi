import { load, sync } from '../self-referential-relations';

const ID_COLUMN = 'id';
const BATCH_SIZE = 1000;

const mockBatchInsert = jest.fn();

// Handles trx(tableName).whereIn(...).select(...) for the idempotency check in sync()
const mockKnexChain = {
  whereIn: jest.fn().mockReturnThis(),
  select: jest.fn().mockResolvedValue([]),
};

const mockTrx = Object.assign(jest.fn().mockReturnValue(mockKnexChain), {
  batchInsert: mockBatchInsert,
});

const createChainedQuery = (result: any[]) => {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.from = jest.fn().mockReturnValue(chain);
  chain.whereIn = jest.fn().mockReturnValue(chain);
  chain.transacting = jest.fn().mockResolvedValue(result);
  return chain;
};

const trxContext = { trx: mockTrx };
const createMockTransaction = () => jest.fn(async (cb: any) => cb(trxContext));

describe('self-referential-relations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
            get: jest.fn().mockReturnValue({
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
          getConnection: jest.fn().mockReturnValue(chain),
        },
      };

      const result = await load('api::category.category' as any, [{ id: '10', locale: 'en' }]);

      expect(result).toHaveLength(0);
      expect(chain.transacting).not.toHaveBeenCalled();
    });

    it('should skip relations without join table', async () => {
      (global as any).strapi = {
        db: {
          metadata: {
            get: jest.fn().mockReturnValue({
              attributes: {
                parent: {
                  type: 'relation',
                  target: 'api::category.category',
                },
              },
            }),
          },
          transaction: createMockTransaction(),
          getConnection: jest.fn(),
        },
      };

      const result = await load('api::category.category' as any, [{ id: '10', locale: 'en' }]);

      expect(result).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('should remap and insert self-referential relations with new IDs', async () => {
      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          dialect: { getBatchInsertSize: jest.fn().mockReturnValue(BATCH_SIZE) },
          transaction: createMockTransaction(),
        },
      };

      const sourceEntries = [{ id: '10', locale: 'en' }];
      const targetEntries = [{ id: '20', locale: 'en' }];
      const relationData = [
        {
          joinTable: {
            name: 'categories_parent_lnk',
            joinColumn: { name: 'category_id' },
            inverseJoinColumn: { name: 'inv_category_id' },
          },
          relations: [{ id: 1, category_id: '10', inv_category_id: '10', field_order: 1 }],
        },
      ];

      await sync(sourceEntries, targetEntries, relationData as any);

      expect(mockBatchInsert).toHaveBeenCalledWith(
        'categories_parent_lnk',
        [{ category_id: '20', inv_category_id: '20', field_order: 1 }],
        1000
      );
    });

    it('should skip relations where source or target cannot be mapped', async () => {
      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          dialect: { getBatchInsertSize: jest.fn().mockReturnValue(BATCH_SIZE) },
          transaction: createMockTransaction(),
        },
      };

      const sourceEntries = [{ id: '10', locale: 'en' }];
      const targetEntries = [{ id: '20', locale: 'en' }];
      const relationData = [
        {
          joinTable: {
            name: 'categories_parent_lnk',
            joinColumn: { name: 'category_id' },
            inverseJoinColumn: { name: 'inv_category_id' },
          },
          relations: [{ id: 1, category_id: '10', inv_category_id: '99', field_order: 1 }],
        },
      ];

      await sync(sourceEntries, targetEntries, relationData as any);

      expect(mockBatchInsert).not.toHaveBeenCalled();
    });

    it('should handle multiple locales', async () => {
      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          dialect: { getBatchInsertSize: jest.fn().mockReturnValue(BATCH_SIZE) },
          transaction: createMockTransaction(),
        },
      };

      const sourceEntries = [
        { id: '10', locale: 'en' },
        { id: '11', locale: 'fr' },
      ];
      const targetEntries = [
        { id: '20', locale: 'en' },
        { id: '21', locale: 'fr' },
      ];
      const relationData = [
        {
          joinTable: {
            name: 'categories_parent_lnk',
            joinColumn: { name: 'category_id' },
            inverseJoinColumn: { name: 'inv_category_id' },
          },
          relations: [
            { id: 1, category_id: '10', inv_category_id: '10', field_order: 1 },
            { id: 2, category_id: '11', inv_category_id: '11', field_order: 1 },
          ],
        },
      ];

      await sync(sourceEntries, targetEntries, relationData as any);

      expect(mockBatchInsert).toHaveBeenCalledWith(
        'categories_parent_lnk',
        [
          { category_id: '20', inv_category_id: '20', field_order: 1 },
          { category_id: '21', inv_category_id: '21', field_order: 1 },
        ],
        1000
      );
    });

    it('should do nothing when relationData is empty', async () => {
      (global as any).strapi = {
        db: {
          metadata: { identifiers: { ID_COLUMN } },
          transaction: createMockTransaction(),
        },
      };

      await sync([{ id: '10', locale: 'en' }], [{ id: '20', locale: 'en' }], []);

      expect(strapi.db.transaction).not.toHaveBeenCalled();
    });
  });
});
