import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';
import { deleteRelations } from '../regular-relations';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

jest.mock('../regular-relations', () => ({
  deletePreviousOneToAnyRelations: jest.fn(),
  deletePreviousAnyToOneRelations: jest.fn(),
  deleteRelations: jest.fn(),
  cleanOrderColumns: jest.fn(),
}));

const attribute = {
  type: 'relation',
  relation: 'manyToMany',
  target: 'api::product.product',
  joinTable: {
    name: 'shops_products_links',
    joinColumn: { name: 'shop_id', referencedColumn: 'id' },
    inverseJoinColumn: { name: 'product_id', referencedColumn: 'id' },
    pivotColumns: ['shop_id', 'product_id'],
  },
};

const createDb = () =>
  ({
    metadata: {
      get: jest.fn(() => ({ attributes: { products: attribute } })),
    },
    dialect: {
      getBatchInsertSize: () => 100,
    },
    lifecycles: {
      run: jest.fn(async () => undefined),
    },
  }) as any;

const chainableQb = () => ({
  insert: jest.fn().mockReturnThis(),
  transacting: jest.fn().mockReturnThis(),
  onConflict: jest.fn().mockReturnThis(),
  merge: jest.fn().mockReturnThis(),
  ignore: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue(undefined),
});

describe('entity-manager updateRelations with set: null (#27432)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createQueryBuilder as jest.Mock).mockReturnValue(chainableQb());
  });

  it('clears every relation when set is null', async () => {
    const em = createEntityManager(createDb());

    await em.updateRelations('api::shop.shop', 1, { products: { set: null } }, {});

    // Before the fix, toAssocs dropped `set: null` (falsy check) and the write
    // degraded into an empty partial update: deleteRelations was never called
    // with 'all' and the relations survived.
    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: 'all' })
    );
    expect(deleteRelations).not.toHaveBeenCalledWith(
      expect.objectContaining({ relIdsToNotDelete: expect.anything() })
    );
  });

  it('still replaces relations when set holds ids', async () => {
    const em = createEntityManager(createDb());

    await em.updateRelations(
      'api::shop.shop',
      1,
      { products: { set: [2, 3] } },
      { transaction: {} }
    );

    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: 'all', relIdsToNotDelete: [2, 3] })
    );
  });

  it('only deletes the disconnected relations on a partial update', async () => {
    const em = createEntityManager(createDb());

    await em.updateRelations('api::shop.shop', 1, { products: { disconnect: [2] } }, {});

    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: [2] })
    );
    expect(deleteRelations).not.toHaveBeenCalledWith(
      expect.objectContaining({ relIdsToDelete: 'all' })
    );
  });

  it('leaves relations alone when set is absent', async () => {
    const em = createEntityManager(createDb());

    await em.updateRelations('api::shop.shop', 1, { products: {} }, {});

    expect(deleteRelations).not.toHaveBeenCalled();
  });
});
